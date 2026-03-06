import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("dashboard_users")
    .insert({
      email: body.email,
      full_name: body.full_name,
      role_id: body.role_id,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
