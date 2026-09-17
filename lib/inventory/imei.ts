export const DEVICE_UNIT_STATUSES = ["in_stock", "sold", "returned", "defective"] as const
export type DeviceUnitStatus = (typeof DEVICE_UNIT_STATUSES)[number]

export const DEVICE_UNIT_STATUS_LABELS: Record<DeviceUnitStatus, string> = {
  in_stock: "En stock",
  sold: "Vendu",
  returned: "Retourné",
  defective: "Défectueux",
}

/** Status changes allowed from the IMEI inventory page */
export const ALLOWED_STATUS_TRANSITIONS: Record<DeviceUnitStatus, DeviceUnitStatus[]> = {
  in_stock: ["defective"],
  sold: ["returned"],
  returned: ["in_stock", "defective"],
  defective: [],
}

/** Luhn checksum used by IMEI numbers */
export function isValidLuhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

/** "length" | "checksum", or null when the IMEI format is valid (for translated UI messages) */
export function imeiFormatErrorCode(imei: string): "length" | "checksum" | null {
  if (!/^\d{15}$/.test(imei)) return "length"
  if (!isValidLuhn(imei)) return "checksum"
  return null
}

/** Returns a French error message, or null when the IMEI format is valid */
export function imeiFormatError(imei: string): string | null {
  const code = imeiFormatErrorCode(imei)
  if (code === "length") return "L'IMEI doit contenir exactement 15 chiffres"
  if (code === "checksum") return "Somme de contrôle IMEI invalide"
  return null
}

/** Splits scanner/pasted input on new lines, commas, semicolons and spaces */
export function splitImeiInput(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
