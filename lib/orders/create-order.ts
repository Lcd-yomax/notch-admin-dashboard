import type { createAdminClient } from "@/lib/supabase/server"
import { missingPriceLabel } from "@/lib/products/activation"

type Admin = ReturnType<typeof createAdminClient>

export interface OrderItemInput {
  variation_id: string
  quantity: number
  unit_price: number
}

/**
 * Rejects items whose variation has no price (price <= 0) or a unit price <= 0.
 * Returns the index of the first bad item and a French message, or null.
 */
export async function checkItemPrices(
  supabase: Admin,
  items: OrderItemInput[]
): Promise<{ index: number; error: string } | null> {
  const ids = [...new Set(items.map((i) => i.variation_id))]
  if (ids.length === 0) return null

  const { data, error } = await supabase
    .from("product_variations")
    .select("id, sku, storage_gb, ram_gb, color, size, price, products(name)")
    .in("id", ids)
  if (error) return { index: 0, error: error.message }

  for (const [index, item] of items.entries()) {
    const variation: any = (data || []).find((v) => v.id === item.variation_id)
    if (!variation) return { index, error: "Variante introuvable" }
    const label = [variation.products?.name, missingPriceLabel(variation)].filter(Boolean).join(" · ")
    if (!(Number(variation.price) > 0)) return { index, error: `Prix manquant : ${label}` }
    if (!(Number(item.unit_price) > 0)) return { index, error: `Prix unitaire invalide : ${label}` }
  }
  return null
}

/**
 * Creates an order and its items the same way the website checkout does:
 * insert the order, insert the items, and delete the order if the items fail
 * so no order is left without items. Variations without a price are rejected.
 */
export async function createOrderWithItems(
  supabase: Admin,
  order: Record<string, unknown>,
  items: OrderItemInput[]
): Promise<{ order: any; error: string | null; status?: number }> {
  const priceError = await checkItemPrices(supabase, items)
  if (priceError) return { order: null, error: priceError.error, status: 400 }

  const { data: created, error: orderError } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single()

  if (orderError || !created) {
    return { order: null, error: orderError?.message || "Commande non créée" }
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items.map((item) => ({ ...item, order_id: created.id })))

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", created.id)
      return { order: null, error: itemsError.message }
    }
  }

  return { order: created, error: null }
}
