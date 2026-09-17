import { authorize, createAdminClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { loadOrderImeiItems } from "@/lib/orders/imei"

// GET /api/orders/<id>/units -> IMEIs assigned to each order item
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const { id } = await params
  const { items, error } = await loadOrderImeiItems(createAdminClient(), id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(items)
}

// POST /api/orders/<id>/units { order_item_id, imei } -> assign_device_unit RPC
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied, userId } = await authorize("inventory.imei")
  if (denied) return denied

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const orderItemId = typeof body.order_item_id === "string" ? body.order_item_id : ""
  const imei = typeof body.imei === "string" ? body.imei.replace(/\s/g, "") : ""

  if (!orderItemId || !imei) {
    return NextResponse.json({ error: "IMEI obligatoire" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { items, error: loadError } = await loadOrderImeiItems(admin, id)
  if (loadError) {
    return NextResponse.json({ error: loadError }, { status: 500 })
  }

  const item = items.find((i) => i.order_item_id === orderItemId)
  if (!item) {
    return NextResponse.json({ error: "Article introuvable dans cette commande" }, { status: 404 })
  }
  // Returned / defective units stay linked for history but do not count: a replacement can be assigned
  if (item.units.filter((u) => u.status === "sold").length >= item.quantity) {
    return NextResponse.json({ error: "Tous les téléphones de cet article ont déjà un IMEI" }, { status: 409 })
  }

  // The RPC checks has_permission() for the logged-in user, so it must run with the user's session
  const supabase = await createClient()
  const { error } = await supabase.rpc("assign_device_unit", {
    p_order_item_id: orderItemId,
    p_imei: imei,
  })

  if (error) {
    // Exact French message raised by the function
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await admin.from("order_activity").insert({
    order_id: id,
    user_id: userId,
    action: "imei_assigned",
    new_value: imei,
  })

  return NextResponse.json({ success: true })
}
