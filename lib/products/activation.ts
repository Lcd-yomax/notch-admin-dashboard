import { formatStorage } from "@/lib/products/smartphone"

// Same rules and messages as the products_check_activation trigger
// (supabase/migrations/add_product_activation_check.sql).

export const PHOTOS_MISSING = "Photos manquantes"

export interface ActivationVariation {
  sku: string | null
  storage_gb: number | null
  ram_gb: number | null
  color: string | null
  size: string | null
  price: number | string
  is_active: boolean
}

/** "256 Go · 8 Go · Noir" (accessories: color · size, fallback SKU) */
export function missingPriceLabel(v: Omit<ActivationVariation, "price" | "is_active">) {
  const label = [
    v.storage_gb ? formatStorage(v.storage_gb) : "",
    v.ram_gb ? `${v.ram_gb} Go` : "",
    v.color?.trim() || "",
    !v.storage_gb && !v.ram_gb ? v.size?.trim() || "" : "",
  ]
    .filter(Boolean)
    .join(" · ")
  return label || v.sku || ""
}

/**
 * Short version of the blockers for messages:
 * "Photos manquantes · Prix manquants sur 20 variantes (128 Go : 8, 256 Go : 12)"
 */
export function summarizeBlockers(blockers: string[]) {
  const parts: string[] = []
  if (blockers.includes(PHOTOS_MISSING)) parts.push(PHOTOS_MISSING)

  const prices = blockers.filter((b) => b.startsWith("Prix manquant : ")).map((b) => b.slice("Prix manquant : ".length))
  if (prices.length === 1) {
    parts.push(`Prix manquant : ${prices[0]}`)
  } else if (prices.length > 1) {
    // Group by the first part of the label (storage for phones, color for accessories)
    const groups = new Map<string, number>()
    for (const label of prices) {
      const key = label.split(" · ")[0]
      groups.set(key, (groups.get(key) ?? 0) + 1)
    }
    const detail = [...groups].map(([key, count]) => `${key} : ${count}`).join(", ")
    parts.push(`Prix manquants sur ${prices.length} variantes (${detail})`)
  }

  return parts.join(" · ")
}

export interface ActivationStatus {
  photosMissing: boolean
  /** Labels of active variations with price <= 0 */
  missingPrices: string[]
  /** Messages shown to the user, e.g. ["Photos manquantes", "Prix manquant : 256 Go · 8 Go · Noir"] */
  blockers: string[]
  ready: boolean
}

export function getActivationStatus(imageCount: number, variations: ActivationVariation[]): ActivationStatus {
  const photosMissing = imageCount === 0
  const missingPrices = variations
    .filter((v) => v.is_active && !(Number(v.price) > 0))
    .sort(
      (a, b) =>
        (a.storage_gb ?? Infinity) - (b.storage_gb ?? Infinity) ||
        (a.ram_gb ?? Infinity) - (b.ram_gb ?? Infinity) ||
        String(a.color ?? "").localeCompare(String(b.color ?? ""))
    )
    .map(missingPriceLabel)
  const blockers = [
    ...(photosMissing ? [PHOTOS_MISSING] : []),
    ...missingPrices.map((label) => `Prix manquant : ${label}`),
  ]
  return { photosMissing, missingPrices, blockers, ready: blockers.length === 0 }
}
