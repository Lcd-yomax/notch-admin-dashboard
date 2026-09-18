import type { createAdminClient } from "@/lib/supabase/server"
import { computePackPricing, type PackPricing } from "@/lib/packs/pricing"

type Admin = ReturnType<typeof createAdminClient>

export const PACK_SELECT = `
  id,
  name,
  slug,
  description,
  image_url,
  discount_percent,
  is_active,
  sort_order,
  created_at,
  pack_items(
    id,
    quantity,
    sort_order,
    variation_id,
    product_variations(
      id, sku, color, size, storage_gb, ram_gb, condition, price, stock, is_active,
      products(id, name, thumbnail_url, is_active, hide_price)
    )
  )
`

export interface PackItemPayload {
  variation_id: string
  quantity: number
}

export interface PackPayload {
  name: string
  slug: string
  description: string | null
  image_url: string | null
  discount_percent: number
  is_active: boolean
  sort_order: number
  items: PackItemPayload[]
}

/** Adds pricing and the reasons a pack is not visible to a pack row */
export function withPricing(pack: any): any & { pricing: PackPricing } {
  const items = [...(pack.pack_items || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
  const pricing = computePackPricing(
    items.map((i: any) => ({
      quantity: i.quantity,
      variation: i.product_variations,
      product: i.product_variations?.products ?? null,
    })),
    Number(pack.discount_percent)
  )
  return { ...pack, pack_items: items, pricing }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validates the pack form; returns field errors (French) */
export function validatePack(body: any): { payload: PackPayload | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const slug = typeof body?.slug === "string" ? body.slug.trim() : ""
  const discount = Number(body?.discount_percent)

  if (!name) errors.name = "Le nom est obligatoire"
  if (!slug) errors.slug = "Le slug est obligatoire"
  if (!Number.isFinite(discount) || discount < 0 || discount >= 100) errors.discount_percent = "Remise entre 0 et 99 %"

  const items: PackItemPayload[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(body?.items) ? body.items : []) {
    const quantity = Number(raw?.quantity)
    if (typeof raw?.variation_id !== "string" || !UUID.test(raw.variation_id)) {
      errors.items = "Choisissez un produit et une variante pour chaque ligne"
    } else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      errors.items = "Quantité entre 1 et 20"
    } else if (seen.has(raw.variation_id)) {
      errors.items = "La même variante est ajoutée deux fois"
    } else {
      seen.add(raw.variation_id)
      items.push({ variation_id: raw.variation_id, quantity })
    }
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors }
  return {
    payload: {
      name,
      slug,
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
      image_url: body.image_url || null,
      discount_percent: Math.round(discount * 100) / 100,
      is_active: body.is_active === true,
      sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      items,
    },
    errors,
  }
}

/**
 * Saves the pack and replaces its items. The pack is saved inactive when it cannot be sold
 * (no item, inactive product, price missing): `blockers` tells why.
 */
export async function savePack(supabase: Admin, payload: PackPayload, packId?: string) {
  const row = {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    image_url: payload.image_url,
    discount_percent: payload.discount_percent,
    sort_order: payload.sort_order,
    // Activated at the end, only if the items allow it
    is_active: false,
  }

  const query = packId
    ? supabase.from("packs").update(row).eq("id", packId).select("id").single()
    : supabase.from("packs").insert(row).select("id").single()
  const { data: saved, error } = await query
  if (error || !saved) {
    if (error?.code === "23505") return { id: null, error: "Ce slug est déjà utilisé", field: "slug", blockers: [] as string[] }
    if (error?.code === "42P01") return { id: null, error: "Exécutez d'abord la migration add_packs_and_popups.sql", blockers: [] as string[] }
    return { id: null, error: error?.message || "Pack non enregistré", blockers: [] as string[] }
  }

  const { error: deleteError } = await supabase.from("pack_items").delete().eq("pack_id", saved.id)
  if (deleteError) return { id: saved.id, error: deleteError.message, blockers: [] as string[] }

  if (payload.items.length > 0) {
    const { error: itemsError } = await supabase.from("pack_items").insert(
      payload.items.map((item, i) => ({ pack_id: saved.id, variation_id: item.variation_id, quantity: item.quantity, sort_order: i }))
    )
    if (itemsError) return { id: saved.id, error: itemsError.message, blockers: [] as string[] }
  }

  let blockers: string[] = []
  if (payload.is_active) {
    const { data: pack } = await supabase.from("packs").select(PACK_SELECT).eq("id", saved.id).single()
    blockers = pack ? withPricing(pack).pricing.issues : ["Pack introuvable"]
    if (blockers.length === 0) {
      const { error: activateError } = await supabase.from("packs").update({ is_active: true }).eq("id", saved.id)
      if (activateError) return { id: saved.id, error: activateError.message, blockers }
    }
  }

  return { id: saved.id, error: null, blockers }
}
