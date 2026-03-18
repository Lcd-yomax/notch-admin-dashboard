import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(
        *,
        product_variations(
          *,
          products(name, thumbnail_url)
        )
      )
    `)
    .eq("id", id)
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
  const denied = await requirePermission("orders:update_status")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  // Get current order to capture old value
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single()

  const oldStatus = current?.status

  const { data, error } = await supabase
    .from("orders")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log the status change activity
  if (oldStatus !== body.status) {
    await supabase.from("order_activity").insert({
      order_id: id,
      user_id: body.user_id || null,
      action: "status_changed",
      old_value: oldStatus,
      new_value: body.status,
      note: body.note || null,
    })
  }

  return NextResponse.json(data)
}
