import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SMARTPHONE_CATEGORY_SLUG } from "@/lib/products/smartphone"

// GET /api/inventory/filters -> options of the IMEI inventory filters
export async function GET() {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()

  const [products, brands] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, categories!inner(slug)")
      .eq("categories.slug", SMARTPHONE_CATEGORY_SLUG)
      .order("name"),
    supabase.from("brands").select("id, name").order("name"),
  ])

  if (products.error || brands.error) {
    return NextResponse.json({ error: products.error?.message || brands.error?.message }, { status: 500 })
  }

  return NextResponse.json({
    products: (products.data || []).map((p) => ({ id: p.id, name: p.name })),
    brands: brands.data || [],
  })
}
