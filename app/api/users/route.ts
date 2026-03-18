import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("dashboard_users")
    .select(`
      id,
      email,
      full_name,
      role_id,
      is_active,
      created_at,
      roles(name)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = data?.map((u: any) => ({
    ...u,
    role_name: u.roles?.name || null,
  })) || []

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const denied = await requirePermission("users:write")
  if (denied) return denied

  const body = await request.json()

  const supabaseAdmin = createAdminClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // 2. Insert dashboard_users row linked to the auth user
  const { data, error } = await supabaseAdmin
    .from("dashboard_users")
    .insert({
      id: authData.user.id,
      email: body.email,
      full_name: body.full_name,
      role_id: body.role_id,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    // Clean up: remove the auth user if dashboard insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
