import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { PACK_SELECT, savePack, validatePack, withPricing } from "@/lib/packs/server"

export async function GET() {
  const { denied } = await authorize(["products:read", "products:write"])
  if (denied) return denied

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("packs")
    .select(PACK_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    const missing = error.code === "42P01" || /packs/.test(error.message) && /does not exist|schema cache/.test(error.message)
    return NextResponse.json(
      { error: missing ? "Exécutez d'abord la migration add_packs_and_popups.sql" : error.message },
      { status: 500 }
    )
  }

  return NextResponse.json((data || []).map(withPricing))
}

export async function POST(request: Request) {
  const { denied } = await authorize("products:write")
  if (denied) return denied

  const { payload, errors } = validatePack(await request.json().catch(() => null))
  if (!payload) {
    return NextResponse.json({ error: "Corrigez les erreurs du formulaire", fieldErrors: errors }, { status: 400 })
  }

  const result = await savePack(createAdminClient(), payload)
  if (result.error) {
    return NextResponse.json(
      { error: result.error, fieldErrors: "field" in result && result.field ? { [result.field]: result.error } : {} },
      { status: result.id ? 500 : 400 }
    )
  }

  return NextResponse.json({ id: result.id, blockers: result.blockers })
}
