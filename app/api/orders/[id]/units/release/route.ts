import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { changeUnitStatus } from "@/lib/inventory/status"
import { loadOrderImeiItems } from "@/lib/orders/imei"

// POST /api/orders/<id>/units/release — order cancelled: sold units go back in stock
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied, userId } = await authorize("inventory.imei")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { data: order } = await supabase.from("orders").select("status").eq("id", id).maybeSingle()
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
  }
  if (order.status !== "cancelled") {
    return NextResponse.json({ error: "La commande n'est pas annulée" }, { status: 400 })
  }

  const { items, error } = await loadOrderImeiItems(supabase, id)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const sold = items.flatMap((i) => i.units).filter((u) => u.status === "sold")
  const failures: string[] = []
  for (const unit of sold) {
    const result = await changeUnitStatus(supabase, {
      unitId: unit.id,
      status: "in_stock",
      userId,
      note: "Commande annulée",
      bypassTransitions: true,
    })
    if (result.error) failures.push(`${unit.imei} : ${result.error}`)
  }

  if (failures.length > 0) {
    return NextResponse.json(
      { error: failures.join(" · "), released: sold.length - failures.length },
      { status: 500 }
    )
  }

  return NextResponse.json({ released: sold.length })
}
