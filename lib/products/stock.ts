import type { createAdminClient } from "@/lib/supabase/server"
import { isSmartphoneCategory } from "@/lib/products/smartphone"

/**
 * True when the stock of a variation is computed from device_units by the database
 * trigger (smartphones, or any variation that already has IMEI units).
 */
export async function isStockManagedByImei(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  variationId?: string
) {
  const { data: product } = await supabase
    .from("products")
    .select("categories(slug)")
    .eq("id", productId)
    .maybeSingle()
  if (isSmartphoneCategory((product?.categories as { slug?: string } | null)?.slug)) return true

  if (!variationId) return false
  const { count } = await supabase
    .from("device_units")
    .select("id", { count: "exact", head: true })
    .eq("variation_id", variationId)
  return (count ?? 0) > 0
}
