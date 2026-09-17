import { stripAccents } from "@/lib/utils"

export const SMARTPHONE_CATEGORY_SLUG = "smartphones"

export const STORAGE_OPTIONS = [32, 64, 128, 256, 512, 1024] as const
export const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16] as const

export type PhoneCondition = "neuf" | "reconditionne" | "occasion"

export const CONDITION_OPTIONS: { value: PhoneCondition; label: string }[] = [
  { value: "neuf", label: "Neuf" },
  { value: "reconditionne", label: "Reconditionné" },
  { value: "occasion", label: "Occasion" },
]

export function isSmartphoneCategory(slug: string | null | undefined) {
  return slug === SMARTPHONE_CATEGORY_SLUG
}

/** 256 -> "256 Go", 1024 -> "1 To" */
export function formatStorage(gb: number | null | undefined) {
  if (!gb) return ""
  if (gb >= 1024 && gb % 1024 === 0) return `${gb / 1024} To`
  return `${gb} Go`
}

export function conditionLabel(condition: string | null | undefined) {
  return CONDITION_OPTIONS.find((c) => c.value === condition)?.label || ""
}

export interface VariationLabelInput {
  storage_gb?: number | null
  ram_gb?: number | null
  color?: string | null
  condition?: string | null
  size?: string | null
}

/** "256 Go · 8 Go RAM · Noir · Neuf" */
export function formatVariationLabel(v: VariationLabelInput) {
  return [
    formatStorage(v.storage_gb),
    v.ram_gb ? `${v.ram_gb} Go RAM` : "",
    v.color || "",
    conditionLabel(v.condition),
    !v.storage_gb && !v.ram_gb ? v.size || "" : "",
  ]
    .filter(Boolean)
    .join(" · ")
}

function skuPart(value: string) {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * BRAND-MODEL-RAM-STORAGE-COLOR, e.g. SAMSUNG-GALAXY-A55-8-256-NOIR.
 * The brand name is removed from the start of the product name to avoid "SAMSUNG-SAMSUNG-...".
 */
export function buildSku({
  brand,
  productName,
  ramGb,
  storageGb,
  color,
}: {
  brand: string | null | undefined
  productName: string
  ramGb: number | null | undefined
  storageGb: number | null | undefined
  color: string | null | undefined
}) {
  const brandPart = brand ? skuPart(brand) : ""
  let modelPart = skuPart(productName)
  if (brandPart && modelPart.startsWith(`${brandPart}-`)) {
    modelPart = modelPart.slice(brandPart.length + 1)
  }
  return [brandPart, modelPart, ramGb ? String(ramGb) : "", storageGb ? String(storageGb) : "", color ? skuPart(color) : ""]
    .filter(Boolean)
    .join("-")
}

export const SPEC_GROUP_ORDER = [
  "Écran",
  "Performance",
  "Stockage",
  "Appareil photo",
  "Batterie",
  "Réseau",
  "Système",
  "Général",
] as const

/** Rows added by the "Modèle smartphone" button */
export const SMARTPHONE_SPEC_TEMPLATE: { group_name: string; label: string }[] = [
  { group_name: "Écran", label: "Taille" },
  { group_name: "Écran", label: "Type" },
  { group_name: "Écran", label: "Taux de rafraîchissement" },
  { group_name: "Écran", label: "Résolution" },
  { group_name: "Performance", label: "Processeur" },
  { group_name: "Performance", label: "RAM" },
  { group_name: "Stockage", label: "Capacités" },
  { group_name: "Appareil photo", label: "Principal" },
  { group_name: "Appareil photo", label: "Frontal" },
  { group_name: "Batterie", label: "Capacité" },
  { group_name: "Batterie", label: "Charge rapide" },
  { group_name: "Réseau", label: "Connectivité" },
  { group_name: "Réseau", label: "SIM" },
  { group_name: "Réseau", label: "NFC" },
  { group_name: "Système", label: "OS" },
  { group_name: "Général", label: "Poids" },
  { group_name: "Général", label: "Dimensions" },
  { group_name: "Général", label: "Année de sortie" },
]

export function sameText(a: string | null | undefined, b: string | null | undefined) {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase()
}
