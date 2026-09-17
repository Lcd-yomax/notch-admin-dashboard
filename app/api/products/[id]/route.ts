import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { activateProduct } from "@/lib/products/activation-server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories(name, slug),
      brands(name),
      product_variations(*),
      product_images(*),
      product_specs(*)
    `)
    .eq("id", id)
    .order("sku", { referencedTable: "product_variations" })
    .order("sort_order", { referencedTable: "product_specs" })
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  // Switching to active goes through the photo / price checks
  const { data: current } = await supabase.from("products").select("is_active").eq("id", id).maybeSingle()
  const wantsActivation = body.is_active === true && current?.is_active !== true

  const { data, error } = await supabase
    .from("products")
    .update({
      name: body.name,
      slug: body.slug,
      description: body.description,
      category_id: body.category_id,
      thumbnail_url: body.thumbnail_url,
      is_active: wantsActivation ? false : body.is_active,
      is_featured: body.is_featured,
      is_best_seller: body.is_best_seller,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (wantsActivation) {
    const { blockers } = await activateProduct(supabase, id)
    return NextResponse.json({ ...data, is_active: blockers.length === 0, activation_blockers: blockers })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("products:delete")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
