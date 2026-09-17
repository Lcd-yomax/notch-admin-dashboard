import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  let { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      slug,
      image_url,
      is_active,
      created_at,
      products(count)
    `)
    .order("name", { ascending: true })

  // Keep the dashboard readable while the category visibility migration is being deployed.
  if (error && /is_active/i.test(error.message)) {
    const fallback = await supabase
      .from("categories")
      .select(`
        id,
        name,
        slug,
        image_url,
        created_at,
        products(count)
      `)
      .order("name", { ascending: true })
    data = (fallback.data ?? []).map((category: any) => ({ ...category, is_active: true }))
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const categories = data?.map((c: any) => ({
    ...c,
    products_count: c.products?.[0]?.count || 0,
  })) || []

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: body.name, slug: body.slug, image_url: body.image_url || null, is_active: body.is_active ?? true })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
