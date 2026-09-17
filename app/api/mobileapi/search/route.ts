import { authorize } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MOBILEAPI_ERRORS, MobileApiError, searchDevices } from "@/lib/mobileapi/client"
import { toSearchResult } from "@/lib/mobileapi/results"

// GET /api/mobileapi/search?q=galaxy a55
export async function GET(request: Request) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const q = new URL(request.url).searchParams.get("q")?.trim() || ""
  if (q.length < 3) {
    return NextResponse.json({ error: "Tapez au moins 3 caractères" }, { status: 400 })
  }

  try {
    const { data } = await searchDevices(q)
    const devices = Array.isArray(data?.devices) ? data.devices : []
    if (devices.length === 0) {
      return NextResponse.json({ error: MOBILEAPI_ERRORS.notFound }, { status: 404 })
    }
    return NextResponse.json(devices.map(toSearchResult))
  } catch (error) {
    if (error instanceof MobileApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: MOBILEAPI_ERRORS.unavailable }, { status: 502 })
  }
}
