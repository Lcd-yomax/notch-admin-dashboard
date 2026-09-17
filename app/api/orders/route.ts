import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createOrderWithItems } from "@/lib/orders/create-order"

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

  // Check for read permissions
  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permissions!inner(key)")
    .eq("role_id", dashUser?.role_id)
    .in("permissions.key", ["orders:read", "orders:read_own"])

  const hasReadPerm = perms?.some((p: any) => p.permissions.key === "orders:read")
  const hasReadOwnPerm = perms?.some((p: any) => p.permissions.key === "orders:read_own")

  if (!hasReadPerm && !hasReadOwnPerm) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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

  // Users with only orders:read_own see their assigned orders
  if (!hasReadPerm && hasReadOwnPerm) {
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

  // 1. Insert order and its items (the order is removed if the items fail)
  const { order, error: createError, status: createStatus } = await createOrderWithItems(
    supabase,
    {
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
      delivery_status: body.delivery_status || "En attente",
      confirmation_status: body.confirmation_status || "pending",
      assigned_to: body.assigned_to,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      click_id: body.click_id,
      referrer: body.referrer
    },
    (body.items || []).map((item: any) => ({
      variation_id: item.variation_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  )

  if (createError) {
    return NextResponse.json({ error: createError }, { status: createStatus ?? 500 })
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
