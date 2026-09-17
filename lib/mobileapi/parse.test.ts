import { describe, expect, it } from "vitest"
import fixture from "./__fixtures__/galaxy-a55.json"
import type { MobileApiDevice } from "./types"
import {
  buildSpecs,
  clean,
  manufacturerName,
  parseBodyWeight,
  parseColors,
  parseFlatWeight,
  parseHardware,
  parseImportedColors,
  parseReleaseYear,
  parseScreenResolutionFlat,
  parseStorageList,
  parseThickness,
  parseVariants,
  parseWifi,
  translateColor,
  formatStorageValues,
} from "./parse"

const device = fixture as unknown as MobileApiDevice

// Exact values expected for the Galaxy A55 fixture
const expectedSpecs: [string, string, string][] = [
  ["Écran", "Taille", '6.6"'],
  ["Écran", "Type", "Super AMOLED"],
  ["Écran", "Taux de rafraîchissement", "120 Hz"],
  ["Écran", "Résolution", "1080 x 2340"],
  ["Écran", "Densité", "390 ppi"],
  ["Écran", "Luminosité", "1000 nits"],
  ["Écran", "HDR", "HDR10+"],
  ["Écran", "Protection", "Corning Gorilla Glass Victus+"],
  ["Performance", "Processeur", "Exynos 1480 (4 nm)"],
  ["Performance", "CPU", "Octa-core"],
  ["Performance", "GPU", "Xclipse 530"],
  ["Performance", "RAM", "6 / 8 / 12 Go"],
  ["Stockage", "Capacités", "128 Go, 256 Go"],
  ["Stockage", "Carte mémoire", "Oui (microSDXC, emplacement SIM partagé)"],
  ["Appareil photo", "Principal", "50 MP + 12 MP + 5 MP"],
  ["Appareil photo", "Stabilisation", "OIS"],
  ["Appareil photo", "Vidéo", "4K@30fps"],
  ["Appareil photo", "Frontal", "32 MP"],
  ["Appareil photo", "Vidéo frontale", "4K@30fps"],
  ["Batterie", "Capacité", "5000 mAh"],
  ["Batterie", "Charge rapide", "25 W"],
  ["Réseau", "Connectivité", "5G"],
  ["Réseau", "SIM", "Dual SIM + eSIM"],
  ["Réseau", "NFC", "Oui (selon le modèle)"],
  ["Réseau", "Wi-Fi", "Wi-Fi 6"],
  ["Réseau", "Bluetooth", "5.3"],
  ["Réseau", "USB", "USB Type-C 2.0"],
  ["Réseau", "GPS", "GPS, GALILEO, GLONASS, BDS, QZSS"],
  ["Système", "OS", "Android 14"],
  ["Système", "Interface", "One UI 6.1"],
  ["Système", "Mises à jour", "4 mises à jour Android"],
  ["Général", "Dimensions", "161.1 x 77.4 x 8.2 mm"],
  ["Général", "Poids", "213 g"],
  ["Général", "Matériaux", "Verre avant et arrière, cadre en aluminium"],
  ["Général", "Étanchéité", "IP67"],
  ["Général", "Capteur d'empreinte", "Sous l'écran"],
  ["Général", "Haut-parleurs", "Stéréo"],
  ["Général", "Prise jack 3,5 mm", "Non"],
  ["Général", "Année de sortie", "2024"],
]

describe("buildSpecs (Galaxy A55 fixture)", () => {
  const specs = buildSpecs(device)

  it("produces the exact expected rows in group and label order", () => {
    expect(specs.map((s) => [s.group_name, s.label, s.value])).toEqual(expectedSpecs)
  })

  it("numbers sort_order from 0 in display order", () => {
    expect(specs.map((s) => s.sort_order)).toEqual(expectedSpecs.map((_, i) => i))
  })

  it("never outputs empty, null or undefined text", () => {
    for (const s of specs) {
      expect(s.value.trim()).not.toBe("")
      expect(s.value).not.toMatch(/\b(null|undefined)\b/)
    }
  })

  it("reads the manufacturer name", () => {
    expect(manufacturerName(device)).toBe("Samsung")
  })
})

describe("variants", () => {
  it("parses the 5 real storage/RAM combinations of memory.internal", () => {
    expect(parseVariants(device.memory?.internal, device.storage)).toEqual([
      { storage_gb: 128, ram_gb: 6 },
      { storage_gb: 128, ram_gb: 8 },
      { storage_gb: 256, ram_gb: 6 },
      { storage_gb: 256, ram_gb: 8 },
      { storage_gb: 256, ram_gb: 12 },
    ])
  })

  it("converts TB and deduplicates", () => {
    expect(parseVariants("1TB 12GB RAM, 1TB 12GB RAM")).toEqual([{ storage_gb: 1024, ram_gb: 12 }])
  })

  it("falls back to the flat storage field with ram_gb null", () => {
    expect(parseVariants(null, "128GB, 256GB")).toEqual([
      { storage_gb: 128, ram_gb: null },
      { storage_gb: 256, ram_gb: null },
    ])
    expect(parseVariants("", "128 GB, 256 GB")).toEqual([
      { storage_gb: 128, ram_gb: null },
      { storage_gb: 256, ram_gb: null },
    ])
  })

  it("formats storages with French units", () => {
    expect(formatStorageValues([256, 128, 1024])).toBe("128 Go, 256 Go, 1 To")
  })
})

describe("colors", () => {
  it("splits colors on commas and trims", () => {
    expect(parseColors(device.colors)).toEqual(["Iceblue", "Lilac", "Navy", "Lemon"])
  })

  it("prefills French names", () => {
    expect(parseImportedColors(device.colors)).toEqual([
      { original: "Iceblue", fr: "Bleu glacier" },
      { original: "Lilac", fr: "Lilas" },
      { original: "Navy", fr: "Bleu marine" },
      { original: "Lemon", fr: "Citron" },
    ])
  })

  it("removes marketing words and keeps unknown colors", () => {
    expect(translateColor("Awesome Lilac")).toBe("Lilas")
    expect(translateColor("Ice Blue")).toBe("Bleu glacier")
    expect(translateColor("Grey")).toBe("Gris")
    expect(translateColor("Titanium Violet")).toBe("Titane Violet")
    expect(translateColor("Sunrise Glow")).toBe("Sunrise Glow")
  })
})

describe("flat-field fallbacks", () => {
  it("screen_resolution", () => {
    expect(parseScreenResolutionFlat('6.6", 1080x2340 pixels')).toEqual({ size: '6.6"', resolution: "1080 x 2340" })
    expect(parseScreenResolutionFlat('6.60", 1080 x 2340 pixels')).toEqual({ size: '6.6"', resolution: "1080 x 2340" })
  })

  it("hardware", () => {
    expect(parseHardware("6-12GB RAM, Exynos 1480")).toEqual({ ram: "6 - 12 Go", chipset: "Exynos 1480" })
    expect(parseHardware("12 GB8 GB RAM, Samsung Exynos 1480 S5E8845")).toEqual({
      ram: "8 / 12 Go",
      chipset: "Samsung Exynos 1480 S5E8845",
    })
  })

  it("storage", () => {
    expect(parseStorageList("128GB, 256GB")).toEqual([128, 256])
    expect(parseStorageList("128 GB, 256 GB")).toEqual([128, 256])
  })

  it("weight", () => {
    expect(parseFlatWeight("213g")).toBe("213 g")
    expect(parseFlatWeight("213.00")).toBe("213 g")
    expect(parseBodyWeight("213 g (7.51 oz)")).toBe("213 g")
  })

  it("thickness", () => {
    expect(parseThickness("8.2mm")).toBe("8.2 mm")
    expect(parseThickness("8.20mm")).toBe("8.2 mm")
  })

  it("release_date", () => {
    expect(parseReleaseYear("Released 2024, March 15")).toBe("2024")
    expect(parseReleaseYear("1Q 2024")).toBe("2024")
  })

  it("uses flat fields when nested objects are missing", () => {
    const flat: MobileApiDevice = {
      id: 1,
      name: "Test",
      storage: "128 GB, 256 GB",
      screen_resolution: '6.60", 1080 x 2340 pixels',
      weight: "213.00",
      hardware: "6-12GB RAM, Exynos 1480",
      battery_capacity: "5000 mAh",
      release_date: "1Q 2024",
      display: null,
      platform: null,
      memory: null,
      body: null,
      battery: null,
    }
    expect(buildSpecs(flat).map((s) => [s.label, s.value])).toEqual([
      ["Taille", '6.6"'],
      ["Résolution", "1080 x 2340"],
      ["Processeur", "Exynos 1480"],
      ["RAM", "6 - 12 Go"],
      ["Capacités", "128 Go, 256 Go"],
      ["Capacité", "5000 mAh"],
      ["Poids", "213 g"],
      ["Année de sortie", "2024"],
    ])
  })
})

describe("skipping missing values", () => {
  it("returns no rows for an empty device", () => {
    expect(buildSpecs({ id: 1, name: "Vide" })).toEqual([])
  })

  it("clean() rejects empty and null-like text", () => {
    expect(clean("")).toBeNull()
    expect(clean("  ")).toBeNull()
    expect(clean("null")).toBeNull()
    expect(clean(undefined)).toBeNull()
  })

  it("parseWifi ranks versions", () => {
    expect(parseWifi("Wi-Fi 802.11 a/b/g/n/ac/6e/7, tri-band")).toBe("Wi-Fi 7")
    expect(parseWifi("Wi-Fi 802.11 a/b/g/n/ac/6e")).toBe("Wi-Fi 6E")
    expect(parseWifi("Wi-Fi 802.11 a/b/g/n/ac")).toBe("Wi-Fi 5")
    expect(parseWifi("Wi-Fi 802.11 b/g/n")).toBe("Wi-Fi 4")
    expect(parseWifi("")).toBeNull()
  })
})
