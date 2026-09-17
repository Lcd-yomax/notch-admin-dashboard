// Server-only client for api.mobileapi.dev. The key never leaves the server:
// only import this file from route handlers.
import type { MobileApiDevice, MobileApiSearchDevice, MobileApiSearchResponse } from "@/lib/mobileapi/types"
import { cachePaths, normalizeQuery, readCache, writeCache } from "@/lib/mobileapi/cache"

if (typeof window !== "undefined") {
  throw new Error("lib/mobileapi/client.ts must only be used on the server")
}

const BASE_URL = "https://api.mobileapi.dev"
const TIMEOUT_MS = 10_000

export const MOBILEAPI_ERRORS = {
  invalidKey: "Clé MobileAPI invalide",
  noCredits: "Crédits MobileAPI épuisés",
  notFound: "Aucun appareil trouvé",
  unavailable: "MobileAPI ne répond pas, réessayez",
} as const

export class MobileApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function request<T>(path: string): Promise<T> {
  const key = process.env.MOBILEAPI_KEY
  if (!key) throw new MobileApiError(MOBILEAPI_ERRORS.invalidKey, 500)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
  } catch {
    throw new MobileApiError(MOBILEAPI_ERRORS.unavailable, 504)
  }

  if (res.status === 401 || res.status === 403) throw new MobileApiError(MOBILEAPI_ERRORS.invalidKey, 502)
  if (res.status === 402 || res.status === 429) throw new MobileApiError(MOBILEAPI_ERRORS.noCredits, 429)
  if (res.status === 404) throw new MobileApiError(MOBILEAPI_ERRORS.notFound, 404)
  if (!res.ok) throw new MobileApiError(MOBILEAPI_ERRORS.unavailable, 502)

  try {
    return (await res.json()) as T
  } catch {
    throw new MobileApiError(MOBILEAPI_ERRORS.unavailable, 502)
  }
}

// Each call costs 1 credit (200 per month). Successful responses are cached 24 h;
// errors are never cached. `cached` tells whether a credit was used.

/** Search results are also indexed by device name, so a later search for that exact name costs nothing */
async function indexDeviceNames(devices: MobileApiSearchDevice[]) {
  await Promise.all(
    devices.flatMap((d) => {
      const names = [d.name, d.manufacturer_name ? `${d.manufacturer_name} ${d.name}` : null].filter(Boolean) as string[]
      return names.map((name) => writeCache(cachePaths.name(name), d))
    })
  )
}

/** GET /devices/search/?name= */
export async function searchDevices(query: string): Promise<{ data: MobileApiSearchResponse; cached: boolean }> {
  const path = cachePaths.search(query)
  const cached = await readCache<MobileApiSearchResponse>(path)
  if (cached) return { data: cached, cached: true }

  const data = await request<MobileApiSearchResponse>(`/devices/search/?name=${encodeURIComponent(normalizeQuery(query))}`)
  await writeCache(path, data)
  if (Array.isArray(data?.devices)) await indexDeviceNames(data.devices)
  return { data, cached: false }
}

/** A device whose exact name was seen in an earlier search (no credit) */
export function findCachedDeviceByName(name: string) {
  return readCache<MobileApiSearchDevice>(cachePaths.name(name))
}

export async function isSearchCached(query: string) {
  return (await readCache(cachePaths.search(query))) !== null || (await findCachedDeviceByName(query)) !== null
}

/** GET /devices/{id}/ */
export async function getDevice(id: string): Promise<{ data: MobileApiDevice; cached: boolean }> {
  const path = cachePaths.device(id)
  const cached = await readCache<MobileApiDevice>(path)
  if (cached) return { data: cached, cached: true }

  const data = await request<MobileApiDevice>(`/devices/${encodeURIComponent(id)}/`)
  await writeCache(path, data)
  return { data, cached: false }
}

export async function isDeviceCached(id: string) {
  return (await readCache(cachePaths.device(id))) !== null
}
