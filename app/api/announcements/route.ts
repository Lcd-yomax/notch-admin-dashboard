import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { POPUP_MIGRATION_WARNING, isMissingPopupColumn, popupFields } from "@/lib/announcements"

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
  const denied = await requirePermission("announcements:write")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json()

  const fields = {
    title: body.title,
    body: body.body,
    image_url: body.image_url || null,
    cta_label: body.cta_label || null,
    cta_url: body.cta_url || null,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    is_active: body.is_active,
  }

  let { data, error } = await supabase
    .from("announcements")
    .insert({ ...fields, ...popupFields(body) })
    .select()
    .single()

  // Before add_packs_and_popups.sql is run the pop-up columns do not exist
  let warning: string | undefined
  if (error && isMissingPopupColumn(error.message)) {
    ;({ data, error } = await supabase.from("announcements").insert(fields).select().single())
    warning = POPUP_MIGRATION_WARNING
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(warning ? { ...data, warning } : data)
}
