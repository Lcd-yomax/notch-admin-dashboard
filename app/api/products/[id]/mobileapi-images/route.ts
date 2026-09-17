import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MobileApiError } from "@/lib/mobileapi/client"
import { importDeviceImages } from "@/lib/mobileapi/images"

// POST /api/products/<id>/mobileapi-images
// Adds the MobileAPI gallery photos to a product imported before photos were supported.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied, permissions } = await authorize("brands.manage")
  if (denied) return denied
  if (!permissions.includes("products:write")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: product, error } = await supabase
    .from("products")
    .select("id, mobileapi_device_id, product_images(id)")
    .eq("id", id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })
  if (!product.mobileapi_device_id) {
    return NextResponse.json({ error: "Ce produit n'est pas lié à MobileAPI" }, { status: 400 })
  }
  // Avoid adding the same photos twice
  if ((product.product_images?.length ?? 0) > 0) {
    return NextResponse.json({ error: "Le produit a déjà des photos" }, { status: 409 })
  }

  try {
    const result = await importDeviceImages(supabase, id, product.mobileapi_device_id)
    if (result.added === 0) {
      return NextResponse.json({ error: result.warnings[0] || "Aucune photo trouvée", ...result }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (e) {
    const status = e instanceof MobileApiError ? e.status : 500
    return NextResponse.json({ error: (e as Error).message }, { status })
  }
}
