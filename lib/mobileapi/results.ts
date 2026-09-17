import { clean, parseColors, parseReleaseYear, parseStorageList, translateColor } from "@/lib/mobileapi/parse"
import type { MobileApiSearchDevice, MobileApiSearchResult } from "@/lib/mobileapi/types"

/** Search device -> what the browser receives (thumbnail only as a preview, never saved) */
export function toSearchResult(d: MobileApiSearchDevice & { storage?: string | null; colors?: string | null }): MobileApiSearchResult {
  return {
    id: String(d.id),
    name: d.name,
    manufacturer_name: clean(d.manufacturer_name),
    release_year: parseReleaseYear(d.release_date),
    match_certainty: clean(d.match_certainty),
    // Only accept real base64 so the data URL cannot carry anything else
    image_b64: d.image_b64 && /^[A-Za-z0-9+/=\s]+$/.test(d.image_b64) ? d.image_b64.replace(/\s/g, "") : null,
    storages: parseStorageList(d.storage),
    colors: parseColors(d.colors).map(translateColor),
  }
}

/** "Samsung" + "Galaxy A55" -> "Samsung Galaxy A55" (no double brand) */
export function importedProductName(name: string, manufacturer: string | null) {
  if (!manufacturer || name.toLowerCase().startsWith(manufacturer.toLowerCase())) return name.trim()
  return `${manufacturer} ${name}`.trim()
}
