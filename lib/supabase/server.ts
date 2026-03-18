import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Check if the authenticated user has a specific permission.
 * Returns NextResponse with 401/403 if denied, or null if allowed.
 */
export async function requirePermission(permission: string): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Look up the user's role, then check if that role has the permission
  const { data: dashUser } = await admin
    .from("dashboard_users")
    .select("role_id, is_active")
    .eq("id", user.id)
    .single()

  if (!dashUser || !dashUser.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: perm } = await admin
    .from("role_permissions")
    .select("permission_id, permissions!inner(key)")
    .eq("role_id", dashUser.role_id)
    .eq("permissions.key", permission)
    .maybeSingle()

  if (!perm) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null // allowed
}
