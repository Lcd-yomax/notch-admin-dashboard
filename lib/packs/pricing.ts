import { formatVariationLabel } from "@/lib/products/smartphone"

// Same rules as the public_packs view (supabase/migrations/add_packs_and_popups.sql)
// and the website checkout: discount applied per unit, rounded to the centime.

export interface PackPricingItem {
  quantity: number
  variation: {
    sku: string | null
    color: string | null
    size: string | null
    storage_gb: number | null
    ram_gb: number | null
    condition?: string | null
    price: number | string
    stock: number
    is_active: boolean
  } | null
  product: {
    name: string
    is_active: boolean
    hide_price: boolean
  } | null
}

export function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Price of one unit inside the pack */
export function packUnitPrice(price: number, discountPercent: number) {
  return round2(price * (1 - discountPercent / 100))
}

export interface PackPricing {
  originalPrice: number
  packPrice: number
  saving: number
  /** One product has a hidden price: the pack is shown "prix sur demande" on the website */
  hidePrice: boolean
  /** Why the pack is not visible on the website even if active */
  issues: string[]
}

export function computePackPricing(items: PackPricingItem[], discountPercent: number): PackPricing {
  let originalPrice = 0
  let packPrice = 0
  const issues: string[] = []

  if (items.length === 0) issues.push("Aucun produit dans le pack")

  for (const item of items) {
    const name = [item.product?.name, item.variation ? formatVariationLabel(item.variation) : ""].filter(Boolean).join(" · ")
    if (!item.variation || !item.product) {
      issues.push("Une variante du pack n'existe plus")
      continue
    }
    const price = Number(item.variation.price)
    if (!item.product.is_active) issues.push(`Produit inactif : ${name}`)
    else if (!item.variation.is_active) issues.push(`Variante inactive : ${name}`)
    if (!(price > 0)) issues.push(`Prix manquant : ${name}`)
    originalPrice += price * item.quantity
    packPrice += packUnitPrice(price, discountPercent) * item.quantity
  }

  return {
    originalPrice: round2(originalPrice),
    packPrice: round2(packPrice),
    saving: round2(originalPrice - packPrice),
    hidePrice: items.some((i) => i.product?.hide_price),
    issues,
  }
}
