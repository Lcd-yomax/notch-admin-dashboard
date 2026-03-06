import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      slug: body.slug,
      description: body.description,
      category_id: body.category_id,
      thumbnail_url: body.thumbnail_url,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
