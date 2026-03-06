import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      customer_email,
      status,
      total_amount,
      created_at,
      order_items(count)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orders = data?.map((o: any) => ({
    ...o,
    items_count: o.order_items?.[0]?.count || 0,
  })) || []

  return NextResponse.json(orders)
}
