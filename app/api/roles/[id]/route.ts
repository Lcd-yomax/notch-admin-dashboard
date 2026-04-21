import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  // For system roles, only allow updating the description (not the name)
  const { data: existing } = await supabase
    .from("roles")
    .select("is_system, name")
    .eq("id", id)
    .single()

  const updateData: Record<string, any> = { description: body.description }
  if (!existing?.is_system) {
    updateData.name = body.name
  }

  const { data, error } = await supabase
    .from("roles")
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
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  // Prevent deleting the super_admin role (would lock everyone out)
  const { data: role } = await supabase
    .from("roles")
    .select("name")
    .eq("id", id)
    .single()

  if (role?.name === "super_admin") {
    return NextResponse.json(
      { error: "Cannot delete the super_admin role" },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
