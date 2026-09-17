import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { CONDITION_OPTIONS, isSmartphoneCategory, sameText } from "@/lib/products/smartphone"
import type { SaveProductPayload, SaveProductResult, SaveStep } from "@/lib/products/form"
import { activateProduct } from "@/lib/products/activation-server"
import { summarizeBlockers } from "@/lib/products/activation"

// POST /api/products/save
// Saves a product with its variations, images and specs from the product form.
// Each part is saved in order; the result tells exactly what was saved and what was not.
export async function POST(request: Request) {
  const { denied, permissions } = await authorize("products:write")
  if (denied) return denied

  const canManageBrands = permissions.includes("brands.manage")
  const canDelete = permissions.includes("products:delete")
  const supabase = createAdminClient()
  const body = (await request.json()) as SaveProductPayload

  const result: SaveProductResult = {
    ok: false,
    product_id: body.product_id || null,
    steps: [],
    field_errors: {},
    variation_errors: {},
    variation_ids: {},
  }
  const steps: SaveStep[] = result.steps
  const skipRemaining = (keys: SaveStep["key"][], message: string) => {
    for (const key of keys) steps.push({ key, status: "skipped", message })
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const p = body.product
  if (!p?.name?.trim()) result.field_errors.name = "Le nom est obligatoire"
  if (!p?.slug?.trim()) result.field_errors.slug = "Le slug est obligatoire"

  const skus = new Map<string, number>()
  body.variations.forEach((v, i) => {
    const errors: { sku?: string; price?: string; form?: string } = {}
    const sku = v.sku?.trim()
    if (!sku) errors.sku = "SKU obligatoire"
    else if (skus.has(sku.toLowerCase())) errors.sku = "SKU en double dans le formulaire"
    else skus.set(sku.toLowerCase(), i)
    if (v.price == null || !Number.isFinite(v.price) || v.price < 0) errors.price = "Prix obligatoire"
    if (!CONDITION_OPTIONS.some((c) => c.value === v.condition)) errors.form = "État invalide"
    if (Object.keys(errors).length > 0) result.variation_errors[i] = errors
  })

  if (Object.keys(result.field_errors).length > 0 || Object.keys(result.variation_errors).length > 0) {
    skipRemaining(["product", "variations", "images", "specs", "activation"], "Corrigez les erreurs du formulaire")
    return NextResponse.json(result, { status: 400 })
  }

  // ── 1. Brand created from the MobileAPI import ─────────────────────────────
  let brandId = p.brand_id
  if (body.new_brand) {
    if (!canManageBrands) {
      steps.push({ key: "brand", status: "failed", message: "Permission « brands.manage » requise pour créer la marque" })
      brandId = null
    } else {
      const { data: existing } = await supabase
        .from("brands")
        .select("id")
        .ilike("name", body.new_brand.name)
        .maybeSingle()
      if (existing) {
        brandId = existing.id
        steps.push({ key: "brand", status: "saved", message: `Marque « ${body.new_brand.name} » déjà existante, utilisée` })
      } else {
        const { data: brand, error } = await supabase
          .from("brands")
          .insert({ name: body.new_brand.name, slug: body.new_brand.slug })
          .select("id")
          .single()
        if (error || !brand) {
          steps.push({ key: "brand", status: "failed", message: error?.message || "Marque non créée" })
          result.field_errors.brand = "La marque n'a pas pu être créée"
          brandId = null
        } else {
          brandId = brand.id
          steps.push({ key: "brand", status: "saved", message: `Marque « ${body.new_brand.name} » créée` })
        }
      }
    }
    result.brand_id = brandId
  }

  // ── 2. Product ─────────────────────────────────────────────────────────────
  // A product only becomes active in the last step, once photos and prices are checked.
  // Products that are already active stay active.
  let wasActive = false
  if (body.product_id) {
    const { data: current } = await supabase.from("products").select("is_active").eq("id", body.product_id).maybeSingle()
    wasActive = current?.is_active === true
  }
  const wantsActivation = p.is_active && !wasActive

  const productRow: Record<string, unknown> = {
    name: p.name.trim(),
    slug: p.slug.trim(),
    description: p.description,
    category_id: p.category_id,
    brand_id: brandId,
    hide_price: p.hide_price,
    is_active: p.is_active && wasActive,
    is_featured: p.is_featured,
    is_best_seller: p.is_best_seller,
  }
  // Only written when set, so saving still works before the column migration is run
  if (p.mobileapi_device_id !== undefined) productRow.mobileapi_device_id = p.mobileapi_device_id

  const productQuery = body.product_id
    ? supabase.from("products").update(productRow).eq("id", body.product_id).select("id").single()
    : supabase.from("products").insert(productRow).select("id").single()
  const { data: savedProduct, error: productError } = await productQuery

  if (productError || !savedProduct) {
    if (productError?.code === "23505" && productError.message.includes("slug")) {
      result.field_errors.slug = "Ce slug est déjà utilisé par un autre produit"
    } else if (productError?.message.includes("mobileapi_device_id")) {
      result.field_errors.name = "Colonne mobileapi_device_id absente : exécutez la migration add_mobileapi_device_id_to_products.sql"
    }
    steps.push({ key: "product", status: "failed", message: productError?.message || "Produit non enregistré" })
    skipRemaining(["variations", "images", "specs", "activation"], "Non enregistré car le produit n'a pas été enregistré")
    return NextResponse.json(result, { status: 400 })
  }

  const productId: string = savedProduct.id
  result.product_id = productId
  steps.push({ key: "product", status: "saved" })

  let isSmartphone = false
  if (p.category_id) {
    const { data: category } = await supabase.from("categories").select("slug").eq("id", p.category_id).maybeSingle()
    isSmartphone = isSmartphoneCategory(category?.slug)
  }

  // ── 3. Variations ──────────────────────────────────────────────────────────
  const variationFailures: string[] = []

  if (body.deleted_variation_ids.length > 0) {
    if (!canDelete) {
      variationFailures.push("Suppression de variantes : permission « products:delete » requise")
    } else {
      for (const id of body.deleted_variation_ids) {
        const { error } = await supabase.from("product_variations").delete().eq("id", id).eq("product_id", productId)
        if (error) {
          variationFailures.push(
            error.code === "23503"
              ? "Une variante utilisée par des commandes ou des IMEI ne peut pas être supprimée (désactivez-la)"
              : `Suppression : ${error.message}`
          )
        }
      }
    }
  }

  const existingIds = body.variations.filter((v) => v.id).map((v) => v.id as string)
  const unitsByVariation = new Set<string>()
  if (existingIds.length > 0) {
    const { data: units } = await supabase.from("device_units").select("variation_id").in("variation_id", existingIds)
    for (const u of units || []) unitsByVariation.add(u.variation_id)
  }

  for (const [i, v] of body.variations.entries()) {
    const row: Record<string, unknown> = {
      sku: v.sku.trim(),
      color: v.color || null,
      size: v.size || null,
      storage_gb: v.storage_gb,
      ram_gb: v.ram_gb,
      condition: v.condition,
      warranty_months: v.warranty_months,
      price: v.price,
      price_display: v.price_display,
      discount_label: v.discount_label || null,
      is_active: v.is_active,
    }
    // Stock of smartphones is kept in sync with device_units by a trigger: never write it.
    // For accessories, only write stock the user actually changed in the form.
    const stockManagedByImei = isSmartphone || (v.id ? unitsByVariation.has(v.id) : false)
    if (!stockManagedByImei && v.stock != null && (!v.id || v.stock !== v.stock_original)) {
      row.stock = Math.max(0, Math.trunc(v.stock))
    }

    const query = v.id
      ? supabase.from("product_variations").update(row).eq("id", v.id).eq("product_id", productId).select("id").single()
      : supabase.from("product_variations").insert({ ...row, product_id: productId }).select("id").single()
    const { data, error } = await query

    if (error || !data) {
      const message = error?.code === "23505" ? "Ce SKU existe déjà" : error?.message || "Variante non enregistrée"
      result.variation_errors[i] = error?.code === "23505" ? { sku: message } : { form: message }
      variationFailures.push(`${v.sku} : ${message}`)
    } else {
      result.variation_ids[i] = data.id
    }
  }

  steps.push(
    variationFailures.length > 0
      ? { key: "variations", status: "failed", message: variationFailures.join(" · ") }
      : { key: "variations", status: "saved" }
  )

  // ── 4. Images ──────────────────────────────────────────────────────────────
  const imageFailures = await syncImages(supabase, productId, body.images)
  steps.push(
    imageFailures.length > 0
      ? { key: "images", status: "failed", message: imageFailures.join(" · ") }
      : { key: "images", status: "saved" }
  )

  // ── 5. Specs ───────────────────────────────────────────────────────────────
  if (body.specs) {
    if (!canManageBrands) {
      steps.push({ key: "specs", status: "failed", message: "Permission « brands.manage » requise" })
    } else {
      const specError = await replaceSpecs(supabase, productId, body.specs)
      steps.push(specError ? { key: "specs", status: "failed", message: specError } : { key: "specs", status: "saved" })
    }
  }

  // ── 6. Activation (photos + prices checked, trigger checks again) ─────────
  if (wantsActivation) {
    const { blockers, error } = await activateProduct(supabase, productId)
    result.activation_blockers = blockers
    steps.push(
      error || blockers.length > 0
        ? { key: "activation", status: "failed", message: error || `Enregistré mais pas activé : ${summarizeBlockers(blockers)}` }
        : { key: "activation", status: "saved" }
    )
  }

  result.ok = steps.every((s) => s.status === "saved")
  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}

type Admin = ReturnType<typeof createAdminClient>

/**
 * Makes product_images match the form. An image linked to a color gets one row per
 * variation of that color; images marked `custom` keep their rows untouched.
 */
async function syncImages(supabase: Admin, productId: string, images: SaveProductPayload["images"]) {
  const failures: string[] = []

  const [{ data: existing, error: loadError }, { data: variations }] = await Promise.all([
    supabase.from("product_images").select("id, url, variation_id").eq("product_id", productId),
    supabase.from("product_variations").select("id, color").eq("product_id", productId),
  ])
  if (loadError) return [loadError.message]

  const wantedUrls = new Set(images.map((img) => img.url))
  const toDelete = (existing || []).filter((row) => !wantedUrls.has(row.url)).map((row) => row.id)
  const toInsert: Record<string, unknown>[] = []

  for (const [index, img] of images.entries()) {
    const rows = (existing || []).filter((row) => row.url === img.url)
    const order = { sort_order: index, is_primary: index === 0 }

    if (img.custom) {
      if (rows.length > 0) {
        await supabase.from("product_images").update(order).in("id", rows.map((r) => r.id))
      }
      continue
    }

    let targets: (string | null)[] = [null]
    if (img.color) {
      const ofColor = (variations || []).filter((v) => sameText(v.color, img.color)).map((v) => v.id)
      if (ofColor.length > 0) targets = ofColor
      else failures.push(`Aucune variante de couleur « ${img.color} » : image gardée pour tout le produit`)
    }

    for (const row of rows) {
      if (!targets.includes(row.variation_id)) toDelete.push(row.id)
    }
    const kept = rows.filter((row) => targets.includes(row.variation_id))
    if (kept.length > 0) {
      await supabase.from("product_images").update(order).in("id", kept.map((r) => r.id))
    }
    for (const target of targets) {
      if (!rows.some((row) => row.variation_id === target)) {
        toInsert.push({ product_id: productId, variation_id: target, url: img.url, ...order })
      }
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase.from("product_images").delete().in("id", toDelete)
    if (error) failures.push(`Suppression d'images : ${error.message}`)
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_images").insert(toInsert)
    if (error) failures.push(`Ajout d'images : ${error.message}`)
  }

  const { error: thumbError } = await supabase
    .from("products")
    .update({ thumbnail_url: images[0]?.url || null })
    .eq("id", productId)
  if (thumbError) failures.push(`Miniature : ${thumbError.message}`)

  return failures
}

/** Replaces all specs of the product; restores the previous rows if the insert fails */
async function replaceSpecs(supabase: Admin, productId: string, specs: NonNullable<SaveProductPayload["specs"]>) {
  const rows = specs
    .filter((s) => s.group_name?.trim() && s.label?.trim() && s.value?.trim())
    .map((s, i) => ({
      product_id: productId,
      group_name: s.group_name.trim(),
      label: s.label.trim(),
      value: s.value.trim(),
      label_ar: s.label_ar?.trim() || null,
      value_ar: s.value_ar?.trim() || null,
      sort_order: i,
    }))

  const { data: previous, error: loadError } = await supabase
    .from("product_specs")
    .select("group_name, label, value, label_ar, value_ar, sort_order")
    .eq("product_id", productId)
  if (loadError) return loadError.message

  const { error: deleteError } = await supabase.from("product_specs").delete().eq("product_id", productId)
  if (deleteError) return deleteError.message

  if (rows.length === 0) return null

  const { error: insertError } = await supabase.from("product_specs").insert(rows)
  if (insertError) {
    if (previous && previous.length > 0) {
      await supabase.from("product_specs").insert(previous.map((s) => ({ ...s, product_id: productId })))
    }
    return `${insertError.message} (anciennes caractéristiques conservées)`
  }
  return null
}
