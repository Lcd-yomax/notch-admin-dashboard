import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { findExistingImeis } from "@/lib/inventory/server"

// POST /api/inventory/imei-check { imeis: string[] } -> { existing: string[] }
export async function POST(request: Request) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const imeis: unknown[] = Array.isArray(body.imeis) ? body.imeis.slice(0, 500) : []

  const supabase = createAdminClient()
  const { existing, error } = await findExistingImeis(supabase, imeis.map(String))

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ existing })
}
