// Server-only: creates an inactive smartphone product from a MobileAPI device.
import type { createAdminClient } from "@/lib/supabase/server"
import { getDevice } from "@/lib/mobileapi/client"
import { buildSpecs, manufacturerName, parseImportedColors, parseVariants } from "@/lib/mobileapi/parse"
import { importedProductName } from "@/lib/mobileapi/results"
import { importDeviceImages } from "@/lib/mobileapi/images"
import { SMARTPHONE_CATEGORY_SLUG, buildSku } from "@/lib/products/smartphone"
import { slugify } from "@/lib/utils"

type Admin = ReturnType<typeof createAdminClient>

export interface ImportedProductRef {
  id: string
  name: string
}

/**
 * Products already imported for these devices: same mobileapi_device_id, or same slug.
 * Returns a map device id -> product.
 */
export async function findImportedProducts(
  supabase: Admin,
  devices: { id: string; name: string; manufacturer: string | null }[]
) {
  const found = new Map<string, ImportedProductRef>()
  if (devices.length === 0) return found

  const slugsByDevice = new Map(
    devices.map((d) => [d.id, [...new Set([slugify(d.name), slugify(importedProductName(d.name, d.manufacturer))])].filter(Boolean)])
  )
  // Ids are digits and slugs are [a-z0-9-], so they are safe inside the filter string
  const ids = devices.map((d) => d.id).filter((id) => /^\d+$/.test(id))
  const slugs = [...new Set([...slugsByDevice.values()].flat())]

  const filters = [
    ids.length > 0 ? `mobileapi_device_id.in.(${ids.join(",")})` : null,
    slugs.length > 0 ? `slug.in.(${slugs.join(",")})` : null,
  ].filter(Boolean)
  if (filters.length === 0) return found

  let { data, error } = await supabase
    .from("products")
    .select("id, name, slug, mobileapi_device_id")
    .or(filters.join(","))

  // Before the mobileapi_device_id migration: match by slug only
  if (error?.message.includes("mobileapi_device_id")) {
    const bySlug = await supabase.from("products").select("id, name, slug").in("slug", slugs)
    data = (bySlug.data || []).map((p) => ({ ...p, mobileapi_device_id: null }))
    error = bySlug.error
  }
  if (error) throw new Error(error.message)

  for (const device of devices) {
    const product = (data || []).find(
      (p: any) => p.mobileapi_device_id === device.id || slugsByDevice.get(device.id)?.includes(p.slug)
    )
    if (product) found.set(device.id, { id: product.id, name: product.name })
  }
  return found
}

export type ImportResult =
  | {
      status: "created"
      product: ImportedProductRef
      variations: number
      specs: number
      images: number
      missing_prices: number
      credits_used: number
      warnings: string[]
    }
  | { status: "exists"; product: ImportedProductRef; credits_used: number }

/**
 * Creates the product (always inactive, price hidden), its variations
 * (storage/RAM x colors, price per storage or 0), its specs and its gallery photos
 * (images narrower than 400 px are skipped).
 */
export async function importDevice(
  supabase: Admin,
  deviceId: string,
  prices: Record<string, number>
): Promise<ImportResult> {
  // Same device id already imported: no details call, no credit
  const { data: byId, error: byIdError } = await supabase
    .from("products")
    .select("id, name")
    .eq("mobileapi_device_id", deviceId)
    .limit(1)
  if (byIdError?.message.includes("mobileapi_device_id")) {
    throw new Error("Exécutez d'abord la migration add_mobileapi_device_id_to_products.sql")
  }
  if (byId && byId.length > 0) return { status: "exists", product: byId[0], credits_used: 0 }

  const { data: device, cached } = await getDevice(deviceId)
  const creditsUsed = cached ? 0 : 1
  const manufacturer = manufacturerName(device)
  const name = importedProductName(device.name, manufacturer)
  const slug = slugify(name)

  const existing = await findImportedProducts(supabase, [{ id: deviceId, name: device.name, manufacturer }])
  if (existing.has(deviceId)) {
    return { status: "exists", product: existing.get(deviceId)!, credits_used: creditsUsed }
  }

  const warnings: string[] = []

  // Category Smartphones
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", SMARTPHONE_CATEGORY_SLUG)
    .maybeSingle()
  if (!category) warnings.push("Catégorie « smartphones » introuvable")

  // Brand: existing (case-insensitive) or created
  let brandId: string | null = null
  if (manufacturer) {
    const { data: brands } = await supabase.from("brands").select("id, name")
    const match = (brands || []).find((b) => b.name.toLowerCase() === manufacturer.toLowerCase())
    if (match) {
      brandId = match.id
    } else {
      const { data: created, error } = await supabase
        .from("brands")
        .insert({ name: manufacturer, slug: slugify(manufacturer) })
        .select("id")
        .single()
      if (created) brandId = created.id
      else warnings.push(`Marque « ${manufacturer} » non créée : ${error?.message}`)
    }
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      description: null,
      category_id: category?.id ?? null,
      brand_id: brandId,
      thumbnail_url: null,
      hide_price: true,
      is_active: false,
      is_featured: false,
      is_best_seller: false,
      mobileapi_device_id: deviceId,
    })
    .select("id, name")
    .single()

  if (productError || !product) {
    if (productError?.code === "23505") {
      const { data: bySlug } = await supabase.from("products").select("id, name").eq("slug", slug).maybeSingle()
      if (bySlug) return { status: "exists", product: bySlug, credits_used: creditsUsed }
    }
    if (productError?.message.includes("mobileapi_device_id")) {
      throw new Error("Exécutez d'abord la migration add_mobileapi_device_id_to_products.sql")
    }
    throw new Error(productError?.message || "Produit non créé")
  }

  // Variations: every storage/RAM combination x every color, price of the storage or 0
  const variants = parseVariants(device.memory?.internal, device.storage)
  const colors = parseImportedColors(device.colors).map((c) => c.fr)
  const rows = variants.flatMap((v) =>
    (colors.length > 0 ? colors : [""]).map((color) => ({
      product_id: product.id,
      sku: buildSku({ brand: manufacturer, productName: name, ramGb: v.ram_gb, storageGb: v.storage_gb, color }),
      color: color || null,
      storage_gb: v.storage_gb,
      ram_gb: v.ram_gb,
      condition: "neuf",
      warranty_months: 12,
      price: prices[String(v.storage_gb)] ?? prices.default ?? 0,
      is_active: true,
    }))
  )

  let variationCount = 0
  if (rows.length > 0) {
    const { error } = await supabase.from("product_variations").insert(rows)
    if (!error) {
      variationCount = rows.length
    } else {
      // One by one so a SKU already used elsewhere does not block the others
      for (const row of rows) {
        const { error: rowError } = await supabase.from("product_variations").insert(row)
        if (rowError) warnings.push(`${row.sku} : ${rowError.code === "23505" ? "SKU déjà utilisé" : rowError.message}`)
        else variationCount++
      }
    }
  } else {
    warnings.push("Aucune variante trouvée dans MobileAPI")
  }

  const specs = buildSpecs(device).map((s) => ({ ...s, product_id: product.id }))
  if (specs.length > 0) {
    const { error } = await supabase.from("product_specs").insert(specs)
    if (error) warnings.push(`Caractéristiques : ${error.message}`)
  }

  // Gallery photos (the product stays usable even if this part fails)
  let imagesAdded = 0
  try {
    const images = await importDeviceImages(supabase, product.id, deviceId)
    imagesAdded = images.added
    warnings.push(...images.warnings)
  } catch (error) {
    warnings.push(`Photos non importées : ${(error as Error).message}`)
  }

  return {
    status: "created",
    product,
    variations: variationCount,
    specs: specs.length,
    images: imagesAdded,
    missing_prices: rows.filter((r) => !(r.price > 0)).length,
    credits_used: creditsUsed,
    warnings,
  }
}
