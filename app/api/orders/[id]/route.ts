import { createAdminClient, createClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const supabase = createAdminClient()
  
  const { data: dashUser } = await supabase
    .from("dashboard_users")
    .select("roles!inner(name)")
    .eq("id", user.id)
    .single()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      dashboard_users(full_name),
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

  if ((dashUser?.roles as any)?.name !== "super_admin" && data.assigned_to !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    ...data,
    assignee_name: data.dashboard_users?.full_name || null
  })
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

  const updateData: any = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
  if (body.delivery_status !== undefined) updateData.delivery_status = body.delivery_status
  if (body.confirmation_status !== undefined) updateData.confirmation_status = body.confirmation_status
  if (body.code_suivi !== undefined) updateData.code_suivi = body.code_suivi

  // Support for full order editing
  if (body.full_name !== undefined) updateData.full_name = body.full_name
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.email !== undefined) updateData.email = body.email
  if (body.city !== undefined) updateData.city = body.city
  if (body.address !== undefined) updateData.address = body.address
  if (body.total_amount !== undefined) updateData.total_amount = body.total_amount
  if (body.notes !== undefined) updateData.notes = body.notes

  if (body.utm_source !== undefined) updateData.utm_source = body.utm_source
  if (body.utm_medium !== undefined) updateData.utm_medium = body.utm_medium
  if (body.utm_campaign !== undefined) updateData.utm_campaign = body.utm_campaign
  if (body.click_id !== undefined) updateData.click_id = body.click_id
  if (body.referrer !== undefined) updateData.referrer = body.referrer

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Handle order items replacement if items are provided
  if (body.items) {
    // 1. Delete existing items
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id)
      
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 2. Insert new items
    if (body.items.length > 0) {
      const orderItemsToInsert = body.items.map((item: any) => ({
        order_id: id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))

      const { error: insertError } = await supabase
        .from("order_items")
        .insert(orderItemsToInsert)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  // Retrieve the updated order to return
  const { data, error } = await supabase
    .from("orders")
    .select()
    .eq("id", id)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("orders:delete")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from("orders").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
