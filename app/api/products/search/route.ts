import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  // Fetch active products along with their variations
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      thumbnail_url,
      categories(slug),
      product_variations(
        id,
        sku,
        size,
        color,
        storage_gb,
        ram_gb,
        condition,
        price,
        stock,
        is_active
      )
    `)
    .eq("is_active", true)
    // Optional: filter out products that have no variations? We'll let the frontend handle that
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
