import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("reviews:approve")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("reviews")
    .update({ is_approved: body.is_approved })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("reviews:delete")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
