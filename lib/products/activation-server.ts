import type { createAdminClient } from "@/lib/supabase/server"
import { getActivationStatus, type ActivationStatus } from "@/lib/products/activation"

type Admin = ReturnType<typeof createAdminClient>

/** Checks photos and prices of a product before activating it */
export async function loadActivationStatus(
  supabase: Admin,
  productId: string
): Promise<{ status: ActivationStatus | null; error: string | null }> {
  const [images, variations] = await Promise.all([
    supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId),
    supabase
      .from("product_variations")
      .select("sku, storage_gb, ram_gb, color, size, price, is_active")
      .eq("product_id", productId),
  ])
  if (images.error || variations.error) {
    return { status: null, error: images.error?.message || variations.error?.message || "Erreur" }
  }
  return { status: getActivationStatus(images.count ?? 0, variations.data || []), error: null }
}

/**
 * Activates a product after checking photos and prices.
 * The database trigger checks again, so the rule also holds outside the dashboard.
 */
export async function activateProduct(supabase: Admin, productId: string) {
  const { status, error } = await loadActivationStatus(supabase, productId)
  if (error || !status) return { blockers: [] as string[], error }
  if (!status.ready) return { blockers: status.blockers, error: null }

  const { error: updateError } = await supabase.from("products").update({ is_active: true }).eq("id", productId)
  if (updateError) {
    // Trigger message: "Activation impossible : Photos manquantes ; Prix manquant : ..."
    const blockers = updateError.message.startsWith("Activation impossible")
      ? updateError.message.replace(/^Activation impossible : /, "").split(" ; ")
      : []
    return { blockers, error: blockers.length > 0 ? null : updateError.message }
  }
  return { blockers: [] as string[], error: null }
}
