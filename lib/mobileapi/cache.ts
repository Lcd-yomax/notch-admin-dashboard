// 24 h cache of MobileAPI responses in a private Supabase Storage bucket.
// Unlike an in-memory cache it survives serverless restarts and can be checked
// before a call, so the dashboard can show the exact credit cost.
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/server"

const BUCKET = "mobileapi-cache"
const TTL_MS = 24 * 60 * 60 * 1000

let bucketReady: Promise<void> | null = null

function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabase.storage.getBucket(BUCKET)
      if (!data) await supabase.storage.createBucket(BUCKET, { public: false })
    })().catch(() => {
      bucketReady = null
    })
  }
  return bucketReady
}

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ")
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export const cachePaths = {
  search: (query: string) => `search/${hash(normalizeQuery(query))}.json`,
  device: (id: string) => `devices/${id.replace(/\D/g, "")}.json`,
  name: (name: string) => `names/${hash(normalizeQuery(name))}.json`,
}

export async function readCache<T>(path: string): Promise<T | null> {
  const supabase = createAdminClient()
  await ensureBucket(supabase)
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) return null
  try {
    const entry = JSON.parse(await data.text()) as { cached_at: number; data: T }
    if (!entry?.cached_at || Date.now() - entry.cached_at > TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

export async function writeCache(path: string, data: unknown) {
  const supabase = createAdminClient()
  await ensureBucket(supabase)
  const body = JSON.stringify({ cached_at: Date.now(), data })
  // A failed cache write must never fail the import
  await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([body], { type: "application/json" }), { upsert: true, contentType: "application/json" })
    .catch(() => null)
}

/** True when the file exists and is younger than 24 h (download is the only reliable check) */
export async function isCached(path: string) {
  return (await readCache<unknown>(path)) !== null
}
