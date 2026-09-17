import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { activateProduct } from "@/lib/products/activation-server"

// POST /api/products/<id>/activate
// 200 { activated: true } or 422 { error, blockers: ["Photos manquantes", "Prix manquant : 256 Go · 8 Go · Noir"] }
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("products:write")
  if (denied) return denied

  const { id } = await params
  const { blockers, error } = await activateProduct(createAdminClient(), id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
  if (blockers.length > 0) {
    return NextResponse.json({ error: "Activation impossible", blockers }, { status: 422 })
  }

  return NextResponse.json({ activated: true })
}
