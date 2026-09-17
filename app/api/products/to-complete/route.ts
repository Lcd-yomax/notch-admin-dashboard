import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getActivationStatus } from "@/lib/products/activation"

// GET /api/products/to-complete -> inactive products with what is missing before activation
export async function GET() {
  const { denied } = await authorize(["products:read", "products:write"])
  if (denied) return denied

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      created_at,
      mobileapi_device_id,
      categories(name),
      brands(name),
      product_images(url, sort_order),
      product_variations(sku, storage_gb, ram_gb, color, size, price, is_active)
    `)
    .eq("is_active", false)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const products = (data || []).map((p: any) => {
    const status = getActivationStatus(p.product_images?.length ?? 0, p.product_variations || [])
    return {
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      mobileapi_device_id: p.mobileapi_device_id ?? null,
      category_name: p.categories?.name ?? null,
      brand_name: p.brands?.name ?? null,
      image_url: [...(p.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url ?? null,
      variations_count: p.product_variations?.length ?? 0,
      photos_missing: status.photosMissing,
      missing_prices: status.missingPrices,
      ready: status.ready,
    }
  })

  return NextResponse.json(products)
}
