// Server-only: downloads MobileAPI device photos and stores them as product images.
import type { createAdminClient } from "@/lib/supabase/server"
import { readCache, writeCache } from "@/lib/mobileapi/cache"
import { MOBILEAPI_ERRORS, MobileApiError } from "@/lib/mobileapi/client"

type Admin = ReturnType<typeof createAdminClient>

const BASE_URL = "https://api.mobileapi.dev"
const TIMEOUT_MS = 15_000
const MAX_BYTES = 5 * 1024 * 1024
/** The thumbnail (75 px) and "main image" (160 px) are too small for the store */
export const MIN_IMAGE_WIDTH = 400
const BUCKET = "product-images"

export interface MobileApiImage {
  id: number | string
  type?: string | null
  image_url: string
  caption?: string | null
  is_official?: boolean
  order?: number
}

/** Only these hosts are downloaded; the API key is only ever sent to api.mobileapi.dev */
function allowedImageUrl(raw: string): { url: URL; withKey: boolean } | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return null
    if (url.hostname === "api.mobileapi.dev") return { url, withKey: true }
    if (url.hostname === "gsmarena.com" || url.hostname.endsWith(".gsmarena.com")) return { url, withKey: false }
    return null
  } catch {
    return null
  }
}

/** Width and height of a JPEG, PNG or WebP file */
export function imageSize(b: Uint8Array): { width: number; height: number; ext: "jpg" | "png" | "webp" } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
    return { width: view.getUint32(16), height: view.getUint32(20), ext: "png" }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue }
      const marker = b[i + 1]
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7), ext: "jpg" }
      }
      i += 2 + view.getUint16(i + 2)
    }
    return null
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...b.slice(12, 16))
    if (chunk === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), ext: "webp" }
    if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff, ext: "webp" }
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, ext: "webp" }
    }
  }
  return null
}

/** GET /devices/{id}/images/ (cached 24 h) */
export async function getDeviceImages(deviceId: string): Promise<{ images: MobileApiImage[]; cached: boolean }> {
  const path = `images/${deviceId.replace(/\D/g, "")}.json`
  const cached = await readCache<MobileApiImage[]>(path)
  if (cached) return { images: cached, cached: true }

  const key = process.env.MOBILEAPI_KEY
  if (!key) throw new MobileApiError(MOBILEAPI_ERRORS.invalidKey, 500)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/devices/${encodeURIComponent(deviceId)}/images/?limit=20`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
  } catch {
    throw new MobileApiError(MOBILEAPI_ERRORS.unavailable, 504)
  }
  if (res.status === 401 || res.status === 403) throw new MobileApiError(MOBILEAPI_ERRORS.invalidKey, 502)
  if (res.status === 402 || res.status === 429) throw new MobileApiError(MOBILEAPI_ERRORS.noCredits, 429)
  if (res.status === 404) return { images: [], cached: false }
  if (!res.ok) throw new MobileApiError(MOBILEAPI_ERRORS.unavailable, 502)

  const data = await res.json().catch(() => null)
  const images: MobileApiImage[] = (Array.isArray(data) ? data : data?.images || data?.results || [])
    .filter((img: MobileApiImage) => typeof img?.image_url === "string")
    .sort((a: MobileApiImage, b: MobileApiImage) => (a.order ?? 0) - (b.order ?? 0))
  await writeCache(path, images)
  return { images, cached: false }
}

async function downloadImage(raw: string): Promise<Uint8Array | null> {
  const allowed = allowedImageUrl(raw)
  if (!allowed) return null
  const key = process.env.MOBILEAPI_KEY
  try {
    const res = await fetch(allowed.url, {
      headers: allowed.withKey && key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      // Never follow a redirect with the key to another host
      redirect: allowed.withKey ? "manual" : "follow",
    })
    if (res.status === 402 || res.status === 429) throw new MobileApiError(MOBILEAPI_ERRORS.noCredits, 429)
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return bytes.length > 0 && bytes.length <= MAX_BYTES ? bytes : null
  } catch (error) {
    if (error instanceof MobileApiError) throw error
    return null
  }
}

/**
 * Downloads the device photos (skipping images narrower than 400 px), uploads them to the
 * product-images bucket and adds product_images rows after the existing ones.
 * The first image becomes the thumbnail when the product has none.
 */
export async function importDeviceImages(supabase: Admin, productId: string, deviceId: string) {
  const warnings: string[] = []
  const { images } = await getDeviceImages(deviceId)

  const urls: string[] = []
  let skippedSmall = 0
  for (const image of images) {
    // Known small images (75 px thumbnail, 160 px main image): skip without downloading
    if (/\/devices\/\d+\/(thumb\.png|image\/?)$/.test(image.image_url)) {
      skippedSmall++
      continue
    }
    const bytes = await downloadImage(image.image_url)
    if (!bytes) continue
    const size = imageSize(bytes)
    if (!size) continue
    if (size.width < MIN_IMAGE_WIDTH) {
      skippedSmall++
      continue
    }
    const path = `products/${crypto.randomUUID()}.${size.ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: size.ext === "jpg" ? "image/jpeg" : `image/${size.ext}`,
      upsert: false,
    })
    if (error) {
      warnings.push(`Photo non enregistrée : ${error.message}`)
      continue
    }
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  }

  if (urls.length === 0) {
    if (images.length > 0) warnings.push("Aucune photo assez grande dans MobileAPI")
    return { added: 0, skippedSmall, warnings }
  }

  const [{ data: existing }, { data: product }] = await Promise.all([
    supabase.from("product_images").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1),
    supabase.from("products").select("thumbnail_url").eq("id", productId).single(),
  ])
  const start = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error: insertError } = await supabase.from("product_images").insert(
    urls.map((url, i) => ({ product_id: productId, url, sort_order: start + i, is_primary: start === 0 && i === 0 }))
  )
  if (insertError) {
    warnings.push(`Photos : ${insertError.message}`)
    return { added: 0, skippedSmall, warnings }
  }
  if (!product?.thumbnail_url) {
    await supabase.from("products").update({ thumbnail_url: urls[0] }).eq("id", productId)
  }
  return { added: urls.length, skippedSmall, warnings }
}
