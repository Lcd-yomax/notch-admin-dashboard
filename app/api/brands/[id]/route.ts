import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { brandError } from "@/lib/brands"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "Le nom et le slug sont obligatoires" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("brands")
    .update({ name: body.name.trim(), slug: body.slug.trim(), logo_url: body.logo_url || null })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(brandError(error), { status: error.code === "23505" ? 409 : 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await authorize("brands.manage")
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cette marque est utilisée par ${count} produit${count > 1 ? "s" : ""}` },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
