import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("reviews")
    .select("*, products(name)")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("reviews:approve")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const updateData: any = {}
  if (body.is_approved !== undefined) updateData.is_approved = body.is_approved
  if (body.product_id !== undefined) updateData.product_id = body.product_id
  if (body.full_name !== undefined) updateData.full_name = body.full_name
  if (body.email !== undefined) updateData.email = body.email
  if (body.stars !== undefined) updateData.stars = body.stars
  if (body.comment !== undefined) updateData.comment = body.comment
  if (body.image_url !== undefined) updateData.image_url = body.image_url

  const { data, error } = await supabase
    .from("reviews")
    .update(updateData)
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
