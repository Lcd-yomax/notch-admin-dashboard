import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isStockManagedByImei } from "@/lib/products/stock"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; variationId: string }> }
) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const { id, variationId } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const update: Record<string, unknown> = {
    sku: body.sku,
    color: body.color || null,
    size: body.size || null,
    price: body.price,
    price_display: body.price_display || null,
    discount_label: body.discount_label || null,
    is_active: body.is_active ?? true,
  }
  // Stock of variations tracked by IMEI is kept in sync by a trigger: never write it
  if (!(await isStockManagedByImei(supabase, id, variationId))) {
    update.stock = body.stock ?? 0
  }

  const { data, error } = await supabase
    .from("product_variations")
    .update(update)
    .eq("id", variationId)
    .eq("product_id", id)
    .select("*, product_images(*)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; variationId: string }> }
) {
  const denied = await requirePermission("products:delete")
  if (denied) return denied

  const { id, variationId } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("product_variations")
    .delete()
    .eq("id", variationId)
    .eq("product_id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
