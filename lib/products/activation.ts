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
