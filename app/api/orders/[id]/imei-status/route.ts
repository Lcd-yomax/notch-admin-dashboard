import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { loadOrderImeiItems } from "@/lib/orders/imei"

// GET /api/orders/<id>/imei-status
// -> { missing: phones without an IMEI, sold_units: units currently sold for this order }
// Used before shipping / after cancelling; returns counts only.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize(["orders:read", "orders:read_own", "orders:update_status", "orders:update_own"])
  if (denied) return denied

  const { id } = await params
  const { items, error } = await loadOrderImeiItems(createAdminClient(), id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const missing = items
    .filter((i) => i.is_smartphone)
    .reduce((sum, i) => sum + Math.max(0, i.quantity - i.units.filter((u) => u.status === "sold").length), 0)
  const soldUnits = items.flatMap((i) => i.units).filter((u) => u.status === "sold").length

  return NextResponse.json({ missing, sold_units: soldUnits })
}
