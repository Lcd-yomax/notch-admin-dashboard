import { sameText, SPEC_GROUP_ORDER, type PhoneCondition } from "@/lib/products/smartphone"

// ─── Drafts used by the product form ─────────────────────────────────────────
// Numbers are kept as strings while editing, like the existing forms do.

export interface VariationDraft {
  key: string
  id?: string
  sku: string
  color: string
  size: string
  storage_gb: string
  ram_gb: string
  condition: PhoneCondition
  warranty_months: string
  price: string
  price_display: string
  discount_label: string
  stock: string
  /** Stock when the form was opened, so we only write stock the user changed */
  stock_original?: string
  is_active: boolean
  deleted?: boolean
}

export interface SpecDraft {
  key: string
  group_name: string
  label: string
  value: string
  label_ar: string
  value_ar: string
}

export interface ImageDraft {
  key: string
  url: string
  /** Not uploaded yet */
  file?: File
  /** null = image of the whole product, otherwise linked to every variation of that color */
  color: string | null
  /** Linked to a hand-picked set of variations (from the product page): left untouched */
  custom?: boolean
}

export function newKey() {
  return crypto.randomUUID()
}

export function emptyVariation(partial: Partial<VariationDraft> = {}): VariationDraft {
  return {
    key: newKey(),
    sku: "",
    color: "",
    size: "",
    storage_gb: "",
    ram_gb: "",
    condition: "neuf",
    warranty_months: "12",
    price: "",
    price_display: "",
    discount_label: "",
    stock: "0",
    is_active: true,
    ...partial,
  }
}

export function emptySpec(partial: Partial<SpecDraft> = {}): SpecDraft {
  return { key: newKey(), group_name: "", label: "", value: "", label_ar: "", value_ar: "", ...partial }
}

// ─── Payload sent to POST /api/products/save ─────────────────────────────────

export interface SaveProductPayload {
  product_id?: string
  product: {
    name: string
    slug: string
    description: string | null
    category_id: string | null
    brand_id: string | null
    hide_price: boolean
    is_active: boolean
    is_featured: boolean
    is_best_seller: boolean
    mobileapi_device_id?: string | null
  }
  /** Brand chosen in the MobileAPI import that does not exist yet */
  new_brand?: { name: string; slug: string } | null
  variations: {
    id?: string
    sku: string
    color: string | null
    size: string | null
    storage_gb: number | null
    ram_gb: number | null
    condition: PhoneCondition
    warranty_months: number | null
    price: number
    price_display: number | null
    discount_label: string | null
    stock?: number
    stock_original?: number
    is_active: boolean
  }[]
  deleted_variation_ids: string[]
  images: { url: string; color: string | null; custom?: boolean }[]
  /** Only sent when the specs editor is shown (brands.manage) */
  specs?: { group_name: string; label: string; value: string; label_ar: string | null; value_ar: string | null; sort_order: number }[]
}

export type SaveStepKey = "brand" | "product" | "variations" | "images" | "specs" | "activation"

export interface SaveStep {
  key: SaveStepKey
  status: "saved" | "failed" | "skipped"
  message?: string
}

export interface SaveProductResult {
  ok: boolean
  product_id: string | null
  brand_id?: string | null
  steps: SaveStep[]
  field_errors: { name?: string; slug?: string; brand?: string; category?: string }
  /** Keyed by index in payload.variations */
  variation_errors: Record<number, { sku?: string; price?: string; form?: string }>
  /** Keyed by index in payload.variations: id of the saved variation */
  variation_ids: Record<number, string>
  /** Why the product stayed inactive: "Photos manquantes", "Prix manquant : 256 Go · 8 Go · Noir" */
  activation_blockers?: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toNumberOrNull(value: string) {
  if (value === "" || value == null) return null
  const n = Number(String(value).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/**
 * Specs in display order: groups by first appearance (known smartphone groups
 * keep their usual order when imported), rows in their order inside the group.
 */
export function orderSpecs<T extends { group_name: string }>(rows: T[]): T[] {
  const groups: string[] = []
  for (const row of rows) {
    if (!groups.some((g) => sameText(g, row.group_name))) groups.push(row.group_name)
  }
  return groups.flatMap((g) => rows.filter((r) => sameText(r.group_name, g)))
}

export function specGroupRank(group: string) {
  const i = SPEC_GROUP_ORDER.findIndex((g) => sameText(g, group))
  return i === -1 ? SPEC_GROUP_ORDER.length : i
}

interface LoadedVariation {
  id: string
  color: string | null
}

interface LoadedImage {
  id: string
  url: string
  variation_id: string | null
  sort_order: number
}

/** Rebuilds the image list of the form from product_images rows (one row per variation when linked to a color) */
export function imagesToDrafts(images: LoadedImage[], variations: LoadedVariation[]): ImageDraft[] {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)
  const urls: string[] = []
  for (const img of sorted) if (!urls.includes(img.url)) urls.push(img.url)

  return urls.map((url) => {
    const rows = sorted.filter((img) => img.url === url)
    if (rows.every((r) => !r.variation_id)) return { key: newKey(), url, color: null }
    if (rows.some((r) => !r.variation_id)) return { key: newKey(), url, color: null, custom: true }

    const linked = rows.map((r) => variations.find((v) => v.id === r.variation_id))
    const color = linked[0]?.color
    const sameColor = !!color && linked.every((v) => v && sameText(v.color, color))
    const allOfColor = variations.filter((v) => sameText(v.color, color))
    if (sameColor && allOfColor.every((v) => rows.some((r) => r.variation_id === v.id))) {
      return { key: newKey(), url, color }
    }
    return { key: newKey(), url, color: null, custom: true }
  })
}
