import { createAdminClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  // Get the authenticated user via SSR client (reads cookies)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Use admin client to bypass RLS and fetch user + permissions
  const admin = createAdminClient()

  // Try by id first, then fall back to email match
  let { data: dashboardUser } = await admin
    .from("dashboard_users")
    .select(`
      id,
      email,
      full_name,
      is_active,
      role_id,
      roles(
        name,
        role_permissions(
          permissions(key)
        )
      )
    `)
    .eq("id", user.id)
    .single()

  if (!dashboardUser && user.email) {
    const { data: byEmail } = await admin
      .from("dashboard_users")
      .select(`
        id,
        email,
        full_name,
        is_active,
        role_id,
        roles(
          name,
          role_permissions(
            permissions(key)
          )
        )
      `)
      .eq("email", user.email)
      .single()
    dashboardUser = byEmail
  }

  // Auto-create dashboard_users row if auth user exists but dashboard row doesn't
  if (!dashboardUser) {
    // Get super_admin role as default for first user, otherwise no role
    const { data: superAdminRole } = await admin
      .from("roles")
      .select("id")
      .eq("name", "super_admin")
      .single()

    const { data: userCount } = await admin
      .from("dashboard_users")
      .select("id", { count: "exact", head: true })

    // First user gets super_admin, others get no role
    const isFirstUser = (userCount as any) === null || (userCount as any)?.length === 0
    const roleId = isFirstUser ? superAdminRole?.id : null

    const { data: newUser } = await admin
      .from("dashboard_users")
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || null,
        role_id: roleId,
        is_active: true,
      })
      .select(`
        id,
        email,
        full_name,
        is_active,
        role_id,
        roles(
          name,
          role_permissions(
            permissions(key)
          )
        )
      `)
      .single()

    dashboardUser = newUser
  }

  if (!dashboardUser) {
    return NextResponse.json(
      { error: "Failed to create dashboard user" },
      { status: 500 }
    )
  }

  const role = (dashboardUser as any).roles
  const permissions: string[] = role?.role_permissions
    ?.map((rp: any) => rp.permissions?.key)
    .filter(Boolean) || []

  return NextResponse.json({
    id: dashboardUser.id,
    email: dashboardUser.email,
    full_name: dashboardUser.full_name,
    is_active: dashboardUser.is_active,
    role: role?.name || null,
    permissions,
  })
}
