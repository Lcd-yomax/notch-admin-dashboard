import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { POPUP_MIGRATION_WARNING, isMissingPopupColumn, popupFields } from "@/lib/announcements"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("announcements:write")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const fields = {
    title: body.title,
    body: body.body,
    image_url: body.image_url ?? null,
    cta_label: body.cta_label,
    cta_url: body.cta_url,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    is_active: body.is_active,
  }

  let { data, error } = await supabase
    .from("announcements")
    .update({ ...fields, ...popupFields(body) })
    .eq("id", id)
    .select()
    .single()

  // Before add_packs_and_popups.sql is run the pop-up columns do not exist
  let warning: string | undefined
  if (error && isMissingPopupColumn(error.message)) {
    ;({ data, error } = await supabase.from("announcements").update(fields).eq("id", id).select().single())
    warning = POPUP_MIGRATION_WARNING
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(warning ? { ...data, warning } : data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("announcements:delete")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
