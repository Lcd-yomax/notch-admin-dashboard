import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const denied = await requirePermission("roles:manage")
  if (denied) return denied

  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("group", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
