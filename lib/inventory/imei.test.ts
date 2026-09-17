import { describe, expect, it } from "vitest"
import { imeiFormatError, isValidLuhn, splitImeiInput } from "./imei"

describe("IMEI validation", () => {
  it("accepts a valid IMEI", () => {
    expect(isValidLuhn("490154203237518")).toBe(true)
    expect(imeiFormatError("490154203237518")).toBeNull()
  })

  it("rejects a wrong checksum", () => {
    expect(imeiFormatError("490154203237519")).toBe("Somme de contrôle IMEI invalide")
  })

  it("rejects anything that is not exactly 15 digits", () => {
    expect(imeiFormatError("49015420323751")).toBe("L'IMEI doit contenir exactement 15 chiffres")
    expect(imeiFormatError("4901542032375180")).toBe("L'IMEI doit contenir exactement 15 chiffres")
    expect(imeiFormatError("49015420323751A")).toBe("L'IMEI doit contenir exactement 15 chiffres")
  })

  it("splits pasted lists on new lines and commas", () => {
    expect(splitImeiInput("490154203237518\n356938035643809, 353918052138960\r\n")).toEqual([
      "490154203237518",
      "356938035643809",
      "353918052138960",
    ])
  })
})
