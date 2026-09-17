import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/inventory/suppliers -> distinct suppliers used in previous receptions
export async function GET() {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("device_units")
    .select("supplier")
    .not("supplier", "is", null)
    .order("received_at", { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const suppliers: string[] = []
  for (const row of data || []) {
    const name = row.supplier?.trim()
    if (name && !suppliers.some((s) => s.toLowerCase() === name.toLowerCase())) suppliers.push(name)
  }

  return NextResponse.json(suppliers.sort((a, b) => a.localeCompare(b)))
}
