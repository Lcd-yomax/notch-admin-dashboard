import type { createAdminClient } from "@/lib/supabase/server"
import {
  ALLOWED_STATUS_TRANSITIONS,
  DEVICE_UNIT_STATUSES,
  type DeviceUnitStatus,
} from "@/lib/inventory/imei"

type Admin = ReturnType<typeof createAdminClient>

export function isDeviceUnitStatus(value: unknown): value is DeviceUnitStatus {
  return typeof value === "string" && (DEVICE_UNIT_STATUSES as readonly string[]).includes(value)
}

/**
 * Changes the status of one device unit and logs it on the linked order.
 * Back "in_stock" means resellable: the unit is unlinked from its order item.
 * `bypassTransitions` is only used when an order is cancelled (sold -> in_stock).
 */
export async function changeUnitStatus(
  supabase: Admin,
  {
    unitId,
    status,
    userId,
    note,
    bypassTransitions = false,
  }: {
    unitId: string
    status: DeviceUnitStatus
    userId: string
    note?: string | null
    bypassTransitions?: boolean
  }
): Promise<{ error: string | null; httpStatus: number }> {
  const { data: unit, error: loadError } = await supabase
    .from("device_units")
    .select("id, imei, status, order_item_id, order_items(order_id)")
    .eq("id", unitId)
    .maybeSingle()

  if (loadError) return { error: loadError.message, httpStatus: 500 }
  if (!unit) return { error: "Unité introuvable", httpStatus: 404 }

  const current = unit.status as DeviceUnitStatus
  if (!bypassTransitions && !ALLOWED_STATUS_TRANSITIONS[current]?.includes(status)) {
    return { error: "Changement de statut non autorisé", httpStatus: 400 }
  }

  const update: Record<string, unknown> = { status }
  if (status === "in_stock") {
    update.order_item_id = null
    update.sold_at = null
  }

  // Only update if nobody changed the status in the meantime
  const { data: updated, error: updateError } = await supabase
    .from("device_units")
    .update(update)
    .eq("id", unitId)
    .eq("status", current)
    .select("id")

  if (updateError) return { error: updateError.message, httpStatus: 500 }
  if (!updated || updated.length === 0) {
    return { error: "Le statut a été modifié entre-temps, rechargez la page", httpStatus: 409 }
  }

  const orderId = (unit.order_items as { order_id?: string } | null)?.order_id
  if (orderId) {
    const cleanNote = note?.trim()
    await supabase.from("order_activity").insert({
      order_id: orderId,
      user_id: userId,
      action: "imei_status_changed",
      old_value: current,
      new_value: status,
      note: cleanNote ? `IMEI ${unit.imei} — ${cleanNote}` : `IMEI ${unit.imei}`,
    })
  }

  return { error: null, httpStatus: 200 }
}
