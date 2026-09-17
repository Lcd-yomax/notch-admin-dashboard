import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { activateProduct } from "@/lib/products/activation-server"

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      category_id,
      thumbnail_url,
      is_active,
      is_featured,
      is_best_seller,
      created_at,
      categories(name),
      product_variations(count)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const products = data?.map((p: any) => ({
    ...p,
    category_name: p.categories?.name || null,
    variations_count: p.product_variations?.[0]?.count || 0,
  })) || []

  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      slug: body.slug,
      description: body.description,
      category_id: body.category_id,
      thumbnail_url: body.thumbnail_url,
      // Always created inactive: a new product has no photos yet (activation rules)
      is_active: false,
      is_featured: body.is_featured ?? false,
      is_best_seller: body.is_best_seller ?? false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.is_active) {
    const { blockers } = await activateProduct(supabase, data.id)
    return NextResponse.json({ ...data, is_active: blockers.length === 0, activation_blockers: blockers })
  }

  return NextResponse.json(data)
}
