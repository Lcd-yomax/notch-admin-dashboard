import { authorize } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isDeviceCached, isSearchCached } from "@/lib/mobileapi/client"
import { normalizeQuery } from "@/lib/mobileapi/cache"

// POST /api/mobileapi/bulk/estimate { queries?: string[], device_ids?: string[] }
// -> credits the searches and details calls will use (cached ones are free)
export async function POST(request: Request) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const queries = [
    ...new Set(
      (Array.isArray(body.queries) ? body.queries : [])
        .map((q: unknown) => normalizeQuery(String(q)))
        .filter((q: string) => q.length >= 3)
    ),
  ].slice(0, 100) as string[]
  const deviceIds = [
    ...new Set((Array.isArray(body.device_ids) ? body.device_ids : []).map(String).filter((id: string) => /^\d+$/.test(id))),
  ].slice(0, 100) as string[]

  const [searchCached, devicesCached] = await Promise.all([
    Promise.all(queries.map(isSearchCached)),
    Promise.all(deviceIds.map(isDeviceCached)),
  ])

  return NextResponse.json({
    search_credits: searchCached.filter((cached) => !cached).length,
    details_credits: devicesCached.filter((cached) => !cached).length,
  })
}
