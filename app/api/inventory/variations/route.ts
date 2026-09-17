import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SMARTPHONE_CATEGORY_SLUG } from "@/lib/products/smartphone"

// GET /api/inventory/variations?q=galaxy          -> smartphone products matching the name
// GET /api/inventory/variations?variation=<id>    -> the product of that variation
export async function GET(request: Request) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() || ""
  const variationId = searchParams.get("variation")

  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      thumbnail_url,
      brands(name),
      categories!inner(slug),
      product_variations(id, sku, storage_gb, ram_gb, color, condition, stock, is_active)
    `)
    .eq("categories.slug", SMARTPHONE_CATEGORY_SLUG)
    .order("name", { ascending: true })
    .limit(20)

  if (variationId) {
    const { data: variation } = await supabase
      .from("product_variations")
      .select("product_id")
      .eq("id", variationId)
      .maybeSingle()
    if (!variation) return NextResponse.json([])
    query = query.eq("id", variation.product_id)
  } else if (q) {
    // Escape PostgREST wildcards typed by the user
    query = query.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const products = (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    thumbnail_url: p.thumbnail_url,
    brand_name: p.brands?.name || null,
    variations: [...(p.product_variations || [])].sort(
      (a, b) => (a.storage_gb ?? 0) - (b.storage_gb ?? 0) || (a.ram_gb ?? 0) - (b.ram_gb ?? 0) || String(a.color).localeCompare(String(b.color))
    ),
  }))

  return NextResponse.json(products)
}
