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
