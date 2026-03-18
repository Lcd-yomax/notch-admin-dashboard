import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("roles")
    .select(`
      id,
      name,
      description,
      is_system,
      created_at,
      role_permissions(count)
    `)
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const roles = data?.map((r: any) => ({
    ...r,
    permissions_count: r.role_permissions?.[0]?.count || 0,
  })) || []

  return NextResponse.json(roles)
}

export async function POST(request: Request) {
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: body.name,
      description: body.description,
      is_system: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
