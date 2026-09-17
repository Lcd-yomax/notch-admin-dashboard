import type { createAdminClient } from "@/lib/supabase/server"
import { isSmartphoneCategory } from "@/lib/products/smartphone"

type Admin = ReturnType<typeof createAdminClient>

export interface OrderImeiItem {
  order_item_id: string
  quantity: number
  is_smartphone: boolean
  units: { id: string; imei: string; imei2: string | null; status: string }[]
}

/** Order items with their device units (no purchase prices) */
export async function loadOrderImeiItems(supabase: Admin, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      product_variations(products(categories(slug))),
      device_units(id, imei, imei2, status)
    `)
    .eq("order_id", orderId)

  if (error) return { items: [] as OrderImeiItem[], error: error.message }

  const items: OrderImeiItem[] = (data || []).map((item: any) => ({
    order_item_id: item.id,
    quantity: item.quantity,
    is_smartphone: isSmartphoneCategory(item.product_variations?.products?.categories?.slug),
    units: (item.device_units || []).map((u: any) => ({ id: u.id, imei: u.imei, imei2: u.imei2, status: u.status })),
  }))
  return { items, error: null }
}
