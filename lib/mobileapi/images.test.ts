import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { MIN_IMAGE_WIDTH, imageSize } from "./images"

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name)))

describe("MobileAPI image size", () => {
  it("reads JPEG sizes of real MobileAPI images", () => {
    expect(imageSize(fixture("image-160x212.jpg"))).toEqual({ width: 160, height: 212, ext: "jpg" })
    expect(imageSize(fixture("image-710x614.jpg"))).toEqual({ width: 710, height: 614, ext: "jpg" })
  })

  it("keeps gallery photos and skips the small main image", () => {
    expect(imageSize(fixture("image-160x212.jpg"))!.width).toBeLessThan(MIN_IMAGE_WIDTH)
    expect(imageSize(fixture("image-710x614.jpg"))!.width).toBeGreaterThanOrEqual(MIN_IMAGE_WIDTH)
  })

  it("rejects non-image data", () => {
    expect(imageSize(new TextEncoder().encode("<html>not an image</html>"))).toBeNull()
  })
})
