import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MOBILEAPI_ERRORS, MobileApiError, findCachedDeviceByName, searchDevices } from "@/lib/mobileapi/client"
import { findImportedProducts } from "@/lib/mobileapi/import"
import { toSearchResult } from "@/lib/mobileapi/results"
import type { MobileApiSearchDevice } from "@/lib/mobileapi/types"

// GET /api/mobileapi/bulk/search?q=galaxy a55[&force=1]
// source: "cache" (same search < 24 h), "name_cache" (device with this exact name already seen:
// no search call), "api" (1 credit). force=1 skips the name cache.
export async function GET(request: Request) {
  const { denied, permissions } = await authorize("brands.manage")
  if (denied) return denied
  if (!permissions.includes("products:write")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const q = params.get("q")?.trim() || ""
  const force = params.get("force") === "1"
  if (q.length < 3) {
    return NextResponse.json({ error: "Tapez au moins 3 caractères" }, { status: 400 })
  }

  try {
    let devices: MobileApiSearchDevice[]
    let source: "cache" | "name_cache" | "api"

    const byName = force ? null : await findCachedDeviceByName(q)
    if (byName) {
      devices = [byName]
      source = "name_cache"
    } else {
      const { data, cached } = await searchDevices(q)
      devices = Array.isArray(data?.devices) ? data.devices : []
      source = cached ? "cache" : "api"
    }

    const results = devices.map(toSearchResult)
    const imported = await findImportedProducts(
      createAdminClient(),
      results.map((r) => ({ id: r.id, name: r.name, manufacturer: r.manufacturer_name }))
    )

    return NextResponse.json({
      source,
      credits_used: source === "api" ? 1 : 0,
      error: results.length === 0 ? MOBILEAPI_ERRORS.notFound : null,
      results: results.map((r) => ({ ...r, already_imported: imported.get(r.id) ?? null })),
    })
  } catch (error) {
    if (error instanceof MobileApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: (error as Error).message || MOBILEAPI_ERRORS.unavailable }, { status: 502 })
  }
}
