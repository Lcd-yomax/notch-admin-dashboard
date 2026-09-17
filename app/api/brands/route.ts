import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { brandError } from "@/lib/brands"

export async function GET() {
  // Brands are listed in the product form too, so products:* users can read them
  const { denied } = await authorize(["brands.manage", "products:read", "products:write"])
  if (denied) return denied

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      slug,
      logo_url,
      created_at,
      products(count)
    `)
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const brands = data?.map((b: any) => ({
    ...b,
    products: undefined,
    products_count: b.products?.[0]?.count || 0,
  })) || []

  return NextResponse.json(brands)
}

export async function POST(request: Request) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "Le nom et le slug sont obligatoires" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ name: body.name.trim(), slug: body.slug.trim(), logo_url: body.logo_url || null })
    .select()
    .single()

  if (error) {
    return NextResponse.json(brandError(error), { status: error.code === "23505" ? 409 : 500 })
  }

  return NextResponse.json(data)
}
