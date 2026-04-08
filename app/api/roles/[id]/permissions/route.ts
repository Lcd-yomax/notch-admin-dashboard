import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const permissionIds = data.map((rp: any) => rp.permission_id)
  return NextResponse.json(permissionIds)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { permissionIds } = body

  if (!Array.isArray(permissionIds)) {
    return NextResponse.json({ error: "Invalid permissions format" }, { status: 400 })
  }

  const supabase = createAdminClient()
  
  // First, delete existing permissions
  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Then, insert new permissions
  if (permissionIds.length > 0) {
    const records = permissionIds.map((permId: string) => ({
      role_id: id,
      permission_id: permId
    }))

    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(records)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
