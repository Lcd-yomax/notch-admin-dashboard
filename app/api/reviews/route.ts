import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      product_id,
      customer_name,
      rating,
      comment,
      created_at,
      products(name)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reviews = data?.map((r: any) => ({
    ...r,
    product_name: r.products?.name || "Unknown Product",
  })) || []

  return NextResponse.json(reviews)
}
