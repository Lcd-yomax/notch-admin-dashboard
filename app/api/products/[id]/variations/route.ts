import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("product_variations")
    .select("*, product_images(*)")
    .eq("product_id", id)
    .order("color")
    .order("size")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const stock = body.stock ?? 0

  const { data, error } = await supabase
    .from("product_variations")
    .insert({
      product_id: id,
      sku: body.sku,
      color: body.color || null,
      size: body.size || null,
      price: body.price,
      price_display: body.price_display || null,
      discount_label: body.discount_label || null,
      stock,
      is_active: body.is_active ?? true,
    })
    .select("*, product_images(*)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
