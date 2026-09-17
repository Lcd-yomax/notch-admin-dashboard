import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MOBILEAPI_ERRORS, MobileApiError } from "@/lib/mobileapi/client"
import { importDevice } from "@/lib/mobileapi/import"

// POST /api/mobileapi/bulk/import { device_id, prices: { "128": 3499, "256": "" } }
// One phone per request so a long import never hits the function timeout.
export async function POST(request: Request) {
  const { denied, permissions } = await authorize("brands.manage")
  if (denied) return denied
  if (!permissions.includes("products:write")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const deviceId = String(body.device_id ?? "")
  if (!/^\d+$/.test(deviceId)) {
    return NextResponse.json({ error: MOBILEAPI_ERRORS.notFound }, { status: 400 })
  }

  // Empty price = 0 (the product cannot be activated until it is filled)
  const prices: Record<string, number> = {}
  for (const [storage, value] of Object.entries(body.prices ?? {})) {
    // "default" applies to storages without their own price (search result without storage list)
    if (!(/^\d+$/.test(storage) || storage === "default") || value === "" || value == null) continue
    const price = Number(value)
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: storage === "default" ? "Prix invalide" : `Prix invalide pour ${storage} Go` }, { status: 400 })
    }
    prices[storage] = Math.round(price * 100) / 100
  }

  try {
    const result = await importDevice(createAdminClient(), deviceId, prices)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MobileApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: (error as Error).message || "Import impossible" }, { status: 500 })
  }
}
