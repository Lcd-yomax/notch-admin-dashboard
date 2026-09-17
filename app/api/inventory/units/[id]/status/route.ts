import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { changeUnitStatus, isDeviceUnitStatus } from "@/lib/inventory/status"

// POST /api/inventory/units/<id>/status { status, note }
// Allowed: in_stock -> defective, sold -> returned, returned -> in_stock | defective
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied, userId } = await authorize("inventory.imei")
  if (denied) return denied

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (!isDeviceUnitStatus(body.status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error, httpStatus } = await changeUnitStatus(supabase, {
    unitId: id,
    status: body.status,
    userId,
    note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
  })

  if (error) {
    return NextResponse.json({ error }, { status: httpStatus })
  }

  return NextResponse.json({ success: true })
}
