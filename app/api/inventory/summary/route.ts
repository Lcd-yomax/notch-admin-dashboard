import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const BATCH = 1000

// GET /api/inventory/summary?month_start=<ISO date of the 1st of the month, local time>
export async function GET(request: Request) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()
  const monthParam = new URL(request.url).searchParams.get("month_start")
  const monthStart = monthParam && !Number.isNaN(Date.parse(monthParam))
    ? new Date(monthParam).toISOString()
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()

  // Units in stock and their value
  let inStock = 0
  let stockValue = 0
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await supabase
      .from("device_units")
      .select("purchase_price")
      .eq("status", "in_stock")
      .order("id")
      .range(offset, offset + BATCH - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const u of data || []) {
      inStock++
      stockValue += Number(u.purchase_price) || 0
    }
    if (!data || data.length < BATCH) break
  }

  // Units sold this month and the margin (sale price of the order item - purchase price)
  let soldThisMonth = 0
  let marginThisMonth = 0
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await supabase
      .from("device_units")
      .select("purchase_price, order_items(unit_price)")
      .eq("status", "sold")
      .gte("sold_at", monthStart)
      .order("id")
      .range(offset, offset + BATCH - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const u of (data || []) as any[]) {
      soldThisMonth++
      const sale = u.order_items?.unit_price
      if (sale != null && u.purchase_price != null) {
        marginThisMonth += Number(sale) - Number(u.purchase_price)
      }
    }
    if (!data || data.length < BATCH) break
  }

  return NextResponse.json({
    in_stock: inStock,
    stock_value: stockValue,
    sold_this_month: soldThisMonth,
    margin_this_month: marginThisMonth,
  })
}
