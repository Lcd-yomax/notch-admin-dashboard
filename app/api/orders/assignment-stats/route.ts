import { createAdminClient, requirePermission } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/orders/assignment-stats
// Returns how many orders each agent is currently assigned
export async function GET() {
  const denied = await requirePermission("orders:read")
  if (denied) return denied

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("v_order_assignment_stats")
    .select("*")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
