import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      body,
      image_url,
      cta_label,
      cta_url,
      starts_at,
      ends_at,
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
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: body.title,
      body: body.body,
      image_url: body.image_url || null,
      cta_label: body.cta_label || null,
      cta_url: body.cta_url || null,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
