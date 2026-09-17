// Pure parsers turning a MobileAPI device into French product_specs rows and variants.
// Rule: missing, empty or unparseable values return null and are skipped. Never guess.

import { formatStorage } from "@/lib/products/smartphone"
import type {
  ImportedColor,
  ImportedSpec,
  ImportedVariant,
  MobileApiDevice,
} from "@/lib/mobileapi/types"

type Text = string | number | null | undefined

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Trimmed text, or null for missing / empty / "null" / "undefined" values */
export function clean(value: Text): string | null {
  if (value == null) return null
  const text = String(value).trim()
  if (!text || text === "null" || text === "undefined") return null
  return text
}

/** First comma-separated part: "4K@30fps, 1080p@30/60fps" -> "4K@30fps" */
export function firstPart(value: Text): string | null {
  const text = clean(value)
  return text ? clean(text.split(",")[0]) : null
}

/** "6.60" -> "6.6", "213.00" -> "213" */
export function formatNumber(value: string | number) {
  return String(Number(value))
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

// ─── Écran ───────────────────────────────────────────────────────────────────

/** "6.6 inches, 106.9 cm2" -> '6.6"' */
export function parseScreenSize(size: Text): string | null {
  const match = clean(size)?.match(/(\d+(?:\.\d+)?)\s*(?:inches|inch|″|")/i)
  return match ? `${formatNumber(match[1])}"` : null
}

/** "Super AMOLED, 120Hz, HDR10+" -> "Super AMOLED" */
export function parseDisplayType(type: Text): string | null {
  const part = firstPart(type)
  // The first part is a panel name, not a refresh rate or brightness
  if (!part || /^\d/.test(part)) return null
  return part
}

/** "120Hz" in display.type -> "120 Hz" */
export function parseRefreshRate(type: Text): string | null {
  const match = clean(type)?.match(/(\d{2,3})\s?Hz/i)
  return match ? `${match[1]} Hz` : null
}

/** "1080 x 2340 pixels, 19.5:9 ratio" -> "1080 x 2340" */
export function parseResolution(resolution: Text): string | null {
  const match = clean(resolution)?.match(/(\d{3,4})\s*x\s*(\d{3,4})/i)
  return match ? `${match[1]} x ${match[2]}` : null
}

/** "(~390 ppi density)" -> "390 ppi" */
export function parseDensity(resolution: Text): string | null {
  const match = clean(resolution)?.match(/~?\s*(\d{2,4})\s*ppi/i)
  return match ? `${match[1]} ppi` : null
}

/** "1000 nits (HBM)" in display.type -> "1000 nits" */
export function parseBrightness(type: Text): string | null {
  const match = clean(type)?.match(/(\d{3,5})\s*nits/i)
  return match ? `${match[1]} nits` : null
}

/** "HDR10+", "HDR10" or "HDR" in display.type */
export function parseHdr(type: Text): string | null {
  const text = clean(type)
  if (!text) return null
  if (/HDR10\+/i.test(text)) return "HDR10+"
  if (/HDR10/i.test(text)) return "HDR10"
  if (/\bHDR\b/i.test(text)) return "HDR"
  return null
}

/** Flat field '6.6", 1080x2340 pixels' -> { size: '6.6"', resolution: "1080 x 2340" } */
export function parseScreenResolutionFlat(value: Text) {
  return { size: parseScreenSize(value), resolution: parseResolution(value) }
}

// ─── Performance ─────────────────────────────────────────────────────────────

/** "Octa-core (4x2.75 GHz Cortex-A78 & ...)" -> "Octa-core" */
export function parseCpu(cpu: Text): string | null {
  const text = clean(cpu)
  return text ? clean(text.split(" (")[0]) : null
}

/** Flat field "6-12GB RAM, Exynos 1480" -> { ram: "6 - 12 Go", chipset: "Exynos 1480" } */
export function parseHardware(hardware: Text): { ram: string | null; chipset: string | null } {
  const text = clean(hardware)
  if (!text) return { ram: null, chipset: null }
  const parts = text.split(",").map((p) => p.trim())
  const ramIndex = parts.findIndex((p) => /RAM/i.test(p))
  let ram: string | null = null
  if (ramIndex !== -1) {
    const ramPart = parts[ramIndex]
    const range = ramPart.match(/(\d+)\s*-\s*(\d+)\s*GB/i)
    if (range) {
      ram = `${range[1]} - ${range[2]} Go`
    } else {
      const values = unique([...ramPart.matchAll(/(\d+(?:\.\d+)?)\s*GB/gi)].map((m) => Number(m[1]))).sort((a, b) => a - b)
      if (values.length > 0) ram = `${values.join(" / ")} Go`
    }
  }
  const chipset = clean(parts.filter((_, i) => i !== ramIndex).join(", "))
  return { ram, chipset }
}

// ─── Stockage & variants ─────────────────────────────────────────────────────

function toGb(value: string, unit: string) {
  const n = Number(value)
  return /TB/i.test(unit) ? n * 1024 : n
}

/** "128GB, 256GB" or "128 GB, 256 GB" -> [128, 256] */
export function parseStorageList(storage: Text): number[] {
  const text = clean(storage)
  if (!text) return []
  return unique([...text.matchAll(/(\d+(?:\.\d+)?)\s*(GB|TB)/gi)].map((m) => toGb(m[1], m[2])))
}

/**
 * "128GB 6GB RAM, 256GB 8GB RAM" -> [{ storage_gb: 128, ram_gb: 6 }, { storage_gb: 256, ram_gb: 8 }]
 * "1TB 12GB RAM" -> [{ storage_gb: 1024, ram_gb: 12 }]. Deduplicated.
 * Without memory.internal: storages from the flat storage field with ram_gb null.
 */
export function parseVariants(internal: Text, flatStorage?: Text): ImportedVariant[] {
  const variants: ImportedVariant[] = []
  const add = (v: ImportedVariant) => {
    if (!variants.some((x) => x.storage_gb === v.storage_gb && x.ram_gb === v.ram_gb)) variants.push(v)
  }

  const text = clean(internal)
  if (text) {
    for (const segment of text.split(",")) {
      const ramMatch = segment.match(/(\d+(?:\.\d+)?)\s*GB\s*RAM/i)
      const withoutRam = ramMatch ? segment.replace(ramMatch[0], "") : segment
      const storageMatch = withoutRam.match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i)
      if (!storageMatch) continue
      add({ storage_gb: toGb(storageMatch[1], storageMatch[2]), ram_gb: ramMatch ? Number(ramMatch[1]) : null })
    }
  }
  if (variants.length > 0) return variants

  for (const storage_gb of parseStorageList(flatStorage)) add({ storage_gb, ram_gb: null })
  return variants
}

/** Unique RAM values of the variants: "6 / 8 / 12 Go" */
export function formatRamValues(variants: ImportedVariant[]): string | null {
  const values = unique(variants.map((v) => v.ram_gb).filter((v): v is number => v != null)).sort((a, b) => a - b)
  return values.length > 0 ? `${values.join(" / ")} Go` : null
}

/** Unique storages of the variants: "128 Go, 256 Go" */
export function formatStorageValues(storages: number[]): string | null {
  const values = unique(storages).sort((a, b) => a - b)
  return values.length > 0 ? values.map(formatStorage).join(", ") : null
}

/** "microSDXC (uses shared SIM slot)" -> "Oui (microSDXC, emplacement SIM partagé)" */
export function parseCardSlot(cardSlot: Text): string | null {
  const text = clean(cardSlot)
  if (!text) return null
  if (/^no\b/i.test(text)) return "Non"
  const type = text.match(/microSD\w*/i)?.[0]
  if (!type) return null
  return /shared SIM slot/i.test(text) ? `Oui (${type}, emplacement SIM partagé)` : `Oui (${type})`
}

// ─── Appareil photo ──────────────────────────────────────────────────────────

/**
 * Megapixel values of camera modules: "50 MP + 12 MP + 5 MP".
 * Modules are glued without separators ("OIS12 MP", "1.12µm5 MP"), so never split on commas.
 */
export function parseMegapixels(modules: Text): string | null {
  const text = clean(modules)
  if (!text) return null
  const values = [...text.matchAll(/(\d+(?:\.\d+)?)\s?MP/g)].map((m) => `${formatNumber(m[1])} MP`)
  return values.length > 0 ? values.join(" + ") : null
}

export function parseStabilization(modules: Text): string | null {
  return clean(modules)?.includes("OIS") ? "OIS" : null
}

// ─── Batterie ────────────────────────────────────────────────────────────────

/** battery.capacity_mah, else "Li-Ion 5000 mAh" -> "5000 mAh" */
export function parseBatteryCapacity(capacityMah: Text, type: Text, flat?: Text): string | null {
  const direct = clean(capacityMah)
  if (direct && /^\d+(?:\.\d+)?$/.test(direct)) return `${formatNumber(direct)} mAh`
  for (const source of [type, flat]) {
    const match = clean(source)?.match(/(\d{3,5})\s*mAh/i)
    if (match) return `${match[1]} mAh`
  }
  return null
}

/** "25W wired" -> "25 W" */
export function parseCharging(charging: Text): string | null {
  const match = clean(charging)?.match(/(\d+(?:\.\d+)?)\s*W\b/)
  return match ? `${formatNumber(match[1])} W` : null
}

// ─── Réseau ──────────────────────────────────────────────────────────────────

export function parseConnectivity(technology: Text): string | null {
  const text = clean(technology)
  if (!text) return null
  if (/5G/i.test(text)) return "5G"
  if (/LTE/i.test(text)) return "4G"
  if (/HSPA|UMTS|EVDO|CDMA2000/i.test(text)) return "3G"
  return null
}

export function parseSim(sim: Text): string | null {
  const text = clean(sim)
  if (!text) return null
  const dual = /Nano-SIM\s*\+\s*Nano-SIM/i.test(text)
  const esim = /eSIM/i.test(text)
  if (dual && esim) return "Dual SIM + eSIM"
  if (dual) return "Dual SIM"
  if (esim) return "Nano-SIM + eSIM"
  if (/Nano-SIM/i.test(text)) return "Nano-SIM"
  return null
}

export function parseNfc(nfc: Text): string | null {
  const text = clean(nfc)
  if (!text) return null
  if (/^yes/i.test(text)) return /market\/region dependent/i.test(text) ? "Oui (selon le modèle)" : "Oui"
  if (/^no\b/i.test(text)) return "Non"
  return null
}

/** Highest Wi-Fi version in "Wi-Fi 802.11 a/b/g/n/ac/6, dual-band" -> "Wi-Fi 6" */
export function parseWifi(wlan: Text): string | null {
  const text = clean(wlan)
  if (!text) return null
  const standards = text.match(/802\.11\s*([a-z0-9/ ]+)/i)?.[1]
  if (!standards) return null
  const tokens = standards.split("/").map((t) => t.trim().toLowerCase())
  if (tokens.some((t) => t === "7" || t === "be")) return "Wi-Fi 7"
  if (tokens.includes("6e")) return "Wi-Fi 6E"
  if (tokens.some((t) => t === "6" || t === "ax")) return "Wi-Fi 6"
  if (tokens.includes("ac")) return "Wi-Fi 5"
  if (tokens.includes("n")) return "Wi-Fi 4"
  return null
}

// ─── Système ─────────────────────────────────────────────────────────────────

const INTERFACES = ["One UI", "HyperOS", "MIUI", "ColorOS", "OxygenOS", "MagicOS", "realme UI", "Funtouch OS"]

/** "Android 14, up to 4 major Android upgrades, One UI 6.1" -> "One UI 6.1" */
export function parseInterface(os: Text): string | null {
  const text = clean(os)
  if (!text) return null
  const part = text
    .split(",")
    .map((p) => p.trim())
    .find((p) => INTERFACES.some((name) => p.toLowerCase().startsWith(name.toLowerCase())))
  return clean(part)
}

/** "up to 4 major Android upgrades" -> "4 mises à jour Android" */
export function parseOsUpdates(os: Text): string | null {
  const match = clean(os)?.match(/up to (\d+) major Android upgrades?/i)
  if (!match) return null
  const n = Number(match[1])
  return n === 1 ? "1 mise à jour Android" : `${n} mises à jour Android`
}

// ─── Général ─────────────────────────────────────────────────────────────────

/** "161.1 x 77.4 x 8.2 mm (6.34 x 3.05 x 0.32 in)" -> "161.1 x 77.4 x 8.2 mm" */
export function parseDimensions(dimensions: Text): string | null {
  const text = clean(dimensions)
  return text ? clean(text.split(" (")[0]) : null
}

/** "213 g (7.51 oz)" -> "213 g" */
export function parseBodyWeight(weight: Text): string | null {
  const match = clean(weight)?.match(/(\d+(?:\.\d+)?)\s*g\b/i)
  return match ? `${formatNumber(match[1])} g` : null
}

/** Flat field "213g" or "213.00" -> "213 g" */
export function parseFlatWeight(weight: Text): string | null {
  const match = clean(weight)?.match(/^(\d+(?:\.\d+)?)\s*(?:g)?$/i)
  return match ? `${formatNumber(match[1])} g` : null
}

/** Flat field "8.2mm" or "8.20mm" -> "8.2 mm" */
export function parseThickness(thickness: Text): string | null {
  const match = clean(thickness)?.match(/^(\d+(?:\.\d+)?)\s*(?:mm)?$/i)
  return match ? `${formatNumber(match[1])} mm` : null
}

export function parseBuild(build: Text): string | null {
  const text = clean(build)
  if (!text) return null
  const lower = text.toLowerCase()
  if (lower.includes("glass front") && lower.includes("glass back") && /alumin(?:um|ium) frame/.test(lower)) {
    return "Verre avant et arrière, cadre en aluminium"
  }
  return text
}

/** "IP67 dust/water resistant" -> "IP67" */
export function parseWaterResistance(other: Text): string | null {
  return clean(other)?.match(/\bIP\d{2}\b/i)?.[0].toUpperCase() ?? null
}

export function parseFingerprint(sensors: Text): string | null {
  const text = clean(sensors)
  if (!text) return null
  if (/under display/i.test(text)) return "Sous l'écran"
  if (/side-mounted/i.test(text)) return "Latéral"
  if (/rear-mounted/i.test(text)) return "Arrière"
  return null
}

export function parseLoudspeaker(loudspeaker: Text): string | null {
  const text = clean(loudspeaker)
  if (!text) return null
  if (/stereo/i.test(text)) return "Stéréo"
  if (/^yes/i.test(text)) return "Mono"
  return null
}

export function parseYesNo(value: Text): string | null {
  const text = clean(value)
  if (!text) return null
  if (/^yes/i.test(text)) return "Oui"
  if (/^no\b/i.test(text)) return "Non"
  return null
}

/** "Released 2024, March 15" or "1Q 2024" -> "2024" */
export function parseReleaseYear(releaseDate: Text): string | null {
  return clean(releaseDate)?.match(/\b(19|20)\d{2}\b/)?.[0] ?? null
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLOR_NAMES: [string, string][] = [
  ["ice blue", "Bleu glacier"],
  ["iceblue", "Bleu glacier"],
  ["black", "Noir"],
  ["white", "Blanc"],
  ["navy", "Bleu marine"],
  ["blue", "Bleu"],
  ["lilac", "Lilas"],
  ["lemon", "Citron"],
  ["green", "Vert"],
  ["mint", "Menthe"],
  ["gray", "Gris"],
  ["grey", "Gris"],
  ["silver", "Argent"],
  ["gold", "Or"],
  ["pink", "Rose"],
  ["purple", "Violet"],
  ["violet", "Violet"],
  ["red", "Rouge"],
  ["yellow", "Jaune"],
  ["orange", "Orange"],
  ["titanium", "Titane"],
  ["graphite", "Graphite"],
  ["cream", "Crème"],
]

/** "Iceblue, Lilac, Navy, Lemon" -> ["Iceblue", "Lilac", "Navy", "Lemon"] */
export function parseColors(colors: Text): string[] {
  const text = clean(colors)
  if (!text) return []
  return unique(text.split(",").map((c) => c.trim()).filter(Boolean))
}

/**
 * French name of a MobileAPI color. Known color words are translated and other
 * words ("Awesome") are removed: "Awesome Lilac" -> "Lilas". Unknown colors stay as-is.
 */
export function translateColor(name: string): string {
  const lower = name.toLowerCase()
  const found: { index: number; end: number; fr: string }[] = []
  for (const [en, fr] of COLOR_NAMES) {
    const re = new RegExp(`\\b${en.replace(" ", "\\s*")}\\b`, "g")
    for (const match of lower.matchAll(re)) {
      const index = match.index ?? 0
      const end = index + match[0].length
      // Longer names are listed first ("ice blue" before "blue"): skip overlapping matches
      if (found.some((f) => index < f.end && end > f.index)) continue
      found.push({ index, end, fr })
    }
  }
  if (found.length === 0) return name.trim()
  return unique(found.sort((a, b) => a.index - b.index).map((f) => f.fr)).join(" ")
}

export function parseImportedColors(colors: Text): ImportedColor[] {
  return parseColors(colors).map((original) => ({ original, fr: translateColor(original) }))
}

// ─── Specs ───────────────────────────────────────────────────────────────────

/**
 * All product_specs rows for a device, in group order
 * (Écran, Performance, Stockage, Appareil photo, Batterie, Réseau, Système, Général).
 */
export function buildSpecs(device: MobileApiDevice): ImportedSpec[] {
  const variants = parseVariants(device.memory?.internal, device.storage)
  const flatScreen = parseScreenResolutionFlat(device.screen_resolution)
  const hardware = parseHardware(device.hardware)
  const os = device.platform?.os

  const rows: [string, string, string | null][] = [
    ["Écran", "Taille", parseScreenSize(device.display?.size) ?? flatScreen.size],
    ["Écran", "Type", parseDisplayType(device.display?.type)],
    ["Écran", "Taux de rafraîchissement", parseRefreshRate(device.display?.type)],
    ["Écran", "Résolution", parseResolution(device.display?.resolution) ?? flatScreen.resolution],
    ["Écran", "Densité", parseDensity(device.display?.resolution)],
    ["Écran", "Luminosité", parseBrightness(device.display?.type)],
    ["Écran", "HDR", parseHdr(device.display?.type)],
    ["Écran", "Protection", clean(device.display?.protection)],

    ["Performance", "Processeur", clean(device.platform?.chipset) ?? hardware.chipset],
    ["Performance", "CPU", parseCpu(device.platform?.cpu)],
    ["Performance", "GPU", clean(device.platform?.gpu)],
    ["Performance", "RAM", formatRamValues(variants) ?? hardware.ram],

    ["Stockage", "Capacités", formatStorageValues(variants.map((v) => v.storage_gb))],
    ["Stockage", "Carte mémoire", parseCardSlot(device.memory?.card_slot)],

    ["Appareil photo", "Principal", parseMegapixels(device.main_camera?.modules)],
    ["Appareil photo", "Stabilisation", parseStabilization(device.main_camera?.modules)],
    ["Appareil photo", "Vidéo", firstPart(device.main_camera?.video)],
    ["Appareil photo", "Frontal", parseMegapixels(device.selfie_camera?.modules)],
    ["Appareil photo", "Vidéo frontale", firstPart(device.selfie_camera?.video)],

    ["Batterie", "Capacité", parseBatteryCapacity(device.battery?.capacity_mah, device.battery?.type, device.battery_capacity)],
    ["Batterie", "Charge rapide", parseCharging(device.battery?.charging)],

    ["Réseau", "Connectivité", parseConnectivity(device.network?.technology)],
    ["Réseau", "SIM", parseSim(device.body?.sim)],
    ["Réseau", "NFC", parseNfc(device.comms?.nfc)],
    ["Réseau", "Wi-Fi", parseWifi(device.comms?.wlan)],
    ["Réseau", "Bluetooth", firstPart(device.comms?.bluetooth)],
    ["Réseau", "USB", firstPart(device.comms?.usb)],
    ["Réseau", "GPS", clean(device.comms?.positioning)],

    ["Système", "OS", firstPart(os)],
    ["Système", "Interface", parseInterface(os)],
    ["Système", "Mises à jour", parseOsUpdates(os)],

    ["Général", "Dimensions", parseDimensions(device.body?.dimensions)],
    ["Général", "Poids", parseBodyWeight(device.body?.weight) ?? parseFlatWeight(device.weight)],
    ["Général", "Matériaux", parseBuild(device.body?.build)],
    ["Général", "Étanchéité", parseWaterResistance(device.body?.other)],
    ["Général", "Capteur d'empreinte", parseFingerprint(device.features?.sensors)],
    ["Général", "Haut-parleurs", parseLoudspeaker(device.sound?.loudspeaker)],
    ["Général", "Prise jack 3,5 mm", parseYesNo(device.sound?.audio_jack)],
    ["Général", "Année de sortie", parseReleaseYear(device.release_date)],
  ]

  return rows
    .filter((row): row is [string, string, string] => clean(row[2]) != null)
    .map(([group_name, label, value], sort_order) => ({ group_name, label, value, sort_order }))
}

export function manufacturerName(device: MobileApiDevice): string | null {
  return clean(device.manufacturer?.name) ?? clean(device.manufacturer_name)
}
