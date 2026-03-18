import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("order_activity")
    .select(`
      id,
      action,
      old_value,
      new_value,
      note,
      created_at,
      dashboard_users(full_name, email)
    `)
    .eq("order_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const activity = data?.map((a: any) => ({
    ...a,
    user_name: a.dashboard_users?.full_name || a.dashboard_users?.email || null,
  })) || []

  return NextResponse.json(activity)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("orders:update_status")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("order_activity")
    .insert({
      order_id: id,
      user_id: body.user_id || null,
      action: body.action,
      old_value: body.old_value || null,
      new_value: body.new_value || null,
      note: body.note || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
