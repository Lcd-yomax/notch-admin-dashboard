import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      content,
      is_active,
      created_at,
      dashboard_users(full_name)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const announcements = data?.map((a: any) => ({
    ...a,
    created_by_name: a.dashboard_users?.full_name || null,
  })) || []

  return NextResponse.json(announcements)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: body.title,
      content: body.content,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
