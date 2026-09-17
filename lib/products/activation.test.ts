import { describe, expect, it } from "vitest"
import { getActivationStatus, missingPriceLabel, summarizeBlockers } from "./activation"

const phone = (storage_gb: number, ram_gb: number, color: string, price: number, is_active = true) => ({
  sku: `SKU-${storage_gb}-${ram_gb}-${color}`,
  storage_gb,
  ram_gb,
  color,
  size: null,
  price,
  is_active,
})

describe("activation rules", () => {
  it("formats missing price labels like the database trigger", () => {
    expect(missingPriceLabel(phone(256, 8, "Noir", 0))).toBe("256 Go · 8 Go · Noir")
    expect(missingPriceLabel(phone(1024, 12, "Bleu", 0))).toBe("1 To · 12 Go · Bleu")
    expect(missingPriceLabel({ sku: "CABLE-1M", storage_gb: null, ram_gb: null, color: "Blanc", size: "1m" })).toBe("Blanc · 1m")
    expect(missingPriceLabel({ sku: "CABLE-1M", storage_gb: null, ram_gb: null, color: null, size: null })).toBe("CABLE-1M")
  })

  it("blocks without photos and lists every active variation without price", () => {
    const status = getActivationStatus(0, [
      phone(256, 8, "Noir", 0),
      phone(128, 6, "Lilas", 3499),
      phone(128, 8, "Bleu", 0),
      phone(512, 12, "Noir", 0, false),
    ])
    expect(status.ready).toBe(false)
    expect(status.blockers).toEqual([
      "Photos manquantes",
      "Prix manquant : 128 Go · 8 Go · Bleu",
      "Prix manquant : 256 Go · 8 Go · Noir",
    ])
  })

  it("summarizes many missing prices by storage", () => {
    const labels = ["6 Go · Bleu glacier", "6 Go · Lilas", "8 Go · Bleu glacier", "8 Go · Lilas"]
    const blockers = [
      ...labels.map((l) => `Prix manquant : 128 Go · ${l}`),
      ...labels.map((l) => `Prix manquant : 256 Go · ${l}`),
      "Prix manquant : 256 Go · 12 Go · Lilas",
    ]
    expect(summarizeBlockers(blockers)).toBe("Prix manquants sur 9 variantes (128 Go : 4, 256 Go : 5)")
    expect(summarizeBlockers(["Photos manquantes", "Prix manquant : 256 Go · 8 Go · Noir"])).toBe(
      "Photos manquantes · Prix manquant : 256 Go · 8 Go · Noir"
    )
  })

  it("is ready with photos and prices", () => {
    const status = getActivationStatus(2, [phone(128, 6, "Lilas", 3499)])
    expect(status).toEqual({ photosMissing: false, missingPrices: [], blockers: [], ready: true })
  })
})
