import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("products:write")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const fields = { name: body.name, slug: body.slug, image_url: body.image_url ?? null }
  const withVisibility = typeof body.is_active === "boolean" ? { ...fields, is_active: body.is_active } : fields

  let { data, error } = await supabase
    .from("categories")
    .update(withVisibility)
    .eq("id", id)
    .select()
    .single()

  // Before add_category_activation.sql is run the column does not exist:
  // still save name, slug and image instead of failing the whole update
  let warning: string | undefined
  if (error && /is_active/i.test(error.message) && withVisibility !== fields) {
    ;({ data, error } = await supabase.from("categories").update(fields).eq("id", id).select().single())
    warning = "Visibilité non enregistrée : exécutez la migration add_category_activation.sql"
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(warning ? { ...data, is_active: true, warning } : data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("products:delete")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
