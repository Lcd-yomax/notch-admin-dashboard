import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST: Add images to a product (used on create)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()
  const { urls } = await request.json()

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "No image URLs provided" }, { status: 400 })
  }

  const rows = urls.map((url: string, i: number) => ({
    product_id: id,
    url,
    sort_order: i,
    is_primary: i === 0,
  }))

  const { data, error } = await supabase
    .from("product_images")
    .insert(rows)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT: Sync images for a product (used on edit)
// - keepIds: existing image IDs to keep
// - newUrls: new image URLs to add
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()
  const { keepIds, newUrls } = await request.json()

  // Delete images that are no longer kept
  if (Array.isArray(keepIds)) {
    const { data: existing } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", id)

    const toDelete = (existing || [])
      .filter((img) => !keepIds.includes(img.id))
      .map((img) => img.id)

    if (toDelete.length > 0) {
      await supabase
        .from("product_images")
        .delete()
        .in("id", toDelete)
    }
  }

  // Add new images
  if (Array.isArray(newUrls) && newUrls.length > 0) {
    // Get current max sort_order
    const { data: currentImages } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)

    const nextOrder = (currentImages?.[0]?.sort_order ?? -1) + 1
    const hasExisting = (keepIds?.length ?? 0) > 0

    const rows = newUrls.map((url: string, i: number) => ({
      product_id: id,
      url,
      sort_order: nextOrder + i,
      is_primary: !hasExisting && i === 0,
    }))

    await supabase.from("product_images").insert(rows)
  }

  // Return updated image list
  const { data } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order")

  return NextResponse.json(data)
}
