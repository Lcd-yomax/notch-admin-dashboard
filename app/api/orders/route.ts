import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const supabase = createAdminClient()
  
  const { data: dashUser } = await supabase
    .from("dashboard_users")
    .select("role_id, roles!inner(name)")
    .eq("id", user.id)
    .single()

  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      full_name,
      email,
      phone,
      city,
      address,
      status,
      delivery_status,
      confirmation_status,
      code_suivi,
      total_amount,
      notes,
      assigned_to,
      created_at,
      order_items(count),
      dashboard_users(full_name)
    `)
    .order("created_at", { ascending: false })

  if ((dashUser?.roles as any)?.name !== "super_admin") {
    query = query.eq("assigned_to", user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orders = data?.map((o: any) => ({
    ...o,
    items_count: o.order_items?.[0]?.count || 0,
    assignee_name: o.dashboard_users?.full_name || null,
  })) || []

  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const body = await request.json()

  // Generate an order number (similar to store logic, e.g. ORD-12345678)
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

  // 1. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([{
      order_number: orderNumber,
      full_name: body.full_name,
      phone: body.phone,
      city: body.city,
      address: body.address,
      email: body.email,
      total_amount: body.total_amount,
      notes: body.notes,
      code_suivi: body.code_suivi,
      status: body.status || "pending",
      delivery_status: body.delivery_status || "pending",
      confirmation_status: body.confirmation_status || "pending",
      assigned_to: body.assigned_to,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      click_id: body.click_id,
      referrer: body.referrer
    }])
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // 2. Insert order items
  if (body.items && body.items.length > 0) {
    const orderItemsToInsert = body.items.map((item: any) => ({
      order_id: order.id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert)

    if (itemsError) {
      // Best effort deletion of the orphaned order if items fail, though less common
      await supabase.from("orders").delete().eq("id", order.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Log creation activity
  await supabase.from("order_activity").insert({
    order_id: order.id,
    user_id: user.id,
    action: "order_created",
    note: "Created via Admin Dashboard"
  })

  return NextResponse.json(order)
}
