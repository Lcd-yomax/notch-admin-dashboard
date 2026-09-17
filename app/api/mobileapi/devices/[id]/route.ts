import { authorize } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MOBILEAPI_ERRORS, MobileApiError, getDevice } from "@/lib/mobileapi/client"
import { buildSpecs, manufacturerName, parseImportedColors, parseVariants } from "@/lib/mobileapi/parse"
import type { MobileApiPreview } from "@/lib/mobileapi/types"

// GET /api/mobileapi/devices/11913
// Returns only the parsed preview (specs, variants, colors), never the raw response.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: MOBILEAPI_ERRORS.notFound }, { status: 404 })
  }

  try {
    const { data: device } = await getDevice(id)
    if (!device?.name) {
      return NextResponse.json({ error: MOBILEAPI_ERRORS.notFound }, { status: 404 })
    }

    const preview: MobileApiPreview = {
      device_id: id,
      name: device.name,
      manufacturer: manufacturerName(device),
      specs: buildSpecs(device),
      variants: parseVariants(device.memory?.internal, device.storage),
      colors: parseImportedColors(device.colors),
    }

    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof MobileApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: MOBILEAPI_ERRORS.unavailable }, { status: 502 })
  }
}
