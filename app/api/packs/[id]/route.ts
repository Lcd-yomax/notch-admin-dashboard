import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { savePack, validatePack } from "@/lib/packs/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("products:write")
  if (denied) return denied

  const { id } = await params
  const { payload, errors } = validatePack(await request.json().catch(() => null))
  if (!payload) {
    return NextResponse.json({ error: "Corrigez les erreurs du formulaire", fieldErrors: errors }, { status: 400 })
  }

  const result = await savePack(createAdminClient(), payload, id)
  if (result.error) {
    return NextResponse.json(
      { error: result.error, fieldErrors: "field" in result && result.field ? { [result.field]: result.error } : {} },
      { status: 400 }
    )
  }

  return NextResponse.json({ id: result.id, blockers: result.blockers })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("products:delete")
  if (denied) return denied

  const { id } = await params
  // Order lines keep their products; their pack_id becomes NULL (ON DELETE SET NULL)
  const { error } = await createAdminClient().from("packs").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
