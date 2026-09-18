import { describe, expect, it } from "vitest"
import { computePackPricing, packUnitPrice } from "./pricing"

const item = (name: string, price: number, quantity = 1, extra: Partial<{ hide: boolean; active: boolean }> = {}) => ({
  quantity,
  variation: { sku: name, color: null, size: null, storage_gb: null, ram_gb: null, price, stock: 10, is_active: extra.active ?? true },
  product: { name, is_active: true, hide_price: extra.hide ?? false },
})

describe("pack pricing", () => {
  it("applies the discount per unit, rounded to the centime", () => {
    expect(packUnitPrice(199, 15)).toBe(169.15)
    const pricing = computePackPricing([item("Chargeur", 199), item("Câble", 49, 2)], 15)
    expect(pricing.originalPrice).toBe(297)
    expect(pricing.packPrice).toBe(169.15 + 41.65 * 2)
    expect(pricing.saving).toBe(44.55)
    expect(pricing.issues).toEqual([])
  })

  it("lists why a pack cannot be shown", () => {
    const pricing = computePackPricing([item("Chargeur", 0), item("Câble", 49, 1, { active: false })], 10)
    expect(pricing.issues).toEqual(["Prix manquant : Chargeur", "Variante inactive : Câble"])
    expect(computePackPricing([], 10).issues).toEqual(["Aucun produit dans le pack"])
  })

  it("marks packs containing a hidden-price product", () => {
    expect(computePackPricing([item("Galaxy A55", 3499, 1, { hide: true }), item("Coque", 99)], 10).hidePrice).toBe(true)
  })
})
