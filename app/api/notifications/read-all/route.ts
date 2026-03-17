import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT() {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
