import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { DEVICE_UNIT_STATUS_LABELS, imeiFormatError } from "@/lib/inventory/imei"
import { findExistingImeis } from "@/lib/inventory/server"
import { isDeviceUnitStatus } from "@/lib/inventory/status"
import { formatVariationLabel } from "@/lib/products/smartphone"

const PAGE_SIZE = 25
const CSV_BATCH = 1000

const UNIT_SELECT = `
  id,
  imei,
  imei2,
  status,
  supplier,
  purchase_price,
  received_at,
  sold_at,
  order_item_id,
  product_variations!inner(
    id, sku, storage_gb, ram_gb, color, condition, product_id,
    products!inner(id, name, brand_id, brands(name))
  ),
  order_items(unit_price, order_id, orders(id, order_number))
`

function unitsQuery(supabase: ReturnType<typeof createAdminClient>, params: URLSearchParams) {
  let query = supabase
    .from("device_units")
    .select(UNIT_SELECT, { count: "exact" })
    .order("received_at", { ascending: false })
    // Stable order so pages and CSV batches never skip or repeat a row
    .order("id", { ascending: true })

  // Digits only, so the value is safe inside the .or() filter string
  const imei = (params.get("imei") || "").replace(/\D/g, "").slice(0, 15)
  if (imei) query = query.or(`imei.ilike.%${imei}%,imei2.ilike.%${imei}%`)

  const product = params.get("product")
  if (product) query = query.eq("product_variations.product_id", product)

  const brand = params.get("brand")
  if (brand) query = query.eq("product_variations.products.brand_id", brand)

  const status = params.get("status")
  if (isDeviceUnitStatus(status)) query = query.eq("status", status)

  const supplier = params.get("supplier")
  if (supplier) query = query.eq("supplier", supplier)

  const from = params.get("from")
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("received_at", `${from}T00:00:00`)

  const to = params.get("to")
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("received_at", `${to}T23:59:59.999`)

  return query
}

function toRow(u: any) {
  const variation = u.product_variations
  const product = variation?.products
  const orderItem = u.order_items
  const purchase = u.purchase_price != null ? Number(u.purchase_price) : null
  const sale = orderItem?.unit_price != null ? Number(orderItem.unit_price) : null
  return {
    id: u.id,
    imei: u.imei,
    imei2: u.imei2,
    status: u.status,
    supplier: u.supplier,
    purchase_price: purchase,
    sale_price: sale,
    margin: purchase != null && sale != null ? sale - purchase : null,
    received_at: u.received_at,
    sold_at: u.sold_at,
    product_id: product?.id ?? null,
    product_name: product?.name ?? null,
    brand_name: product?.brands?.name ?? null,
    sku: variation?.sku ?? null,
    variation_label: variation ? formatVariationLabel(variation) : null,
    order_id: orderItem?.orders?.id ?? orderItem?.order_id ?? null,
    order_number: orderItem?.orders?.order_number ?? null,
  }
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function frDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" }) : ""
}

function frNumber(value: number | null) {
  return value == null ? "" : value.toFixed(2).replace(".", ",")
}

// GET /api/inventory/units?imei=&product=&brand=&status=&supplier=&from=&to=&page=
// GET /api/inventory/units?...&format=csv  -> every row of the current filters
export async function GET(request: Request) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()
  const params = new URL(request.url).searchParams

  if (params.get("format") === "csv") {
    const rows: ReturnType<typeof toRow>[] = []
    for (let offset = 0; ; offset += CSV_BATCH) {
      const { data, error } = await unitsQuery(supabase, params).range(offset, offset + CSV_BATCH - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      rows.push(...(data || []).map(toRow))
      if (!data || data.length < CSV_BATCH) break
    }

    const header = ["IMEI", "IMEI 2", "Produit", "Marque", "Variante", "SKU", "Statut", "Fournisseur", "Prix d'achat", "Prix de vente", "Marge", "Reçu le", "Vendu le", "Commande"]
    const lines = rows.map((r) =>
      [
        r.imei, r.imei2, r.product_name, r.brand_name, r.variation_label, r.sku,
        DEVICE_UNIT_STATUS_LABELS[r.status as keyof typeof DEVICE_UNIT_STATUS_LABELS] ?? r.status,
        r.supplier, frNumber(r.purchase_price), frNumber(r.sale_price), frNumber(r.margin),
        frDate(r.received_at), frDate(r.sold_at), r.order_number,
      ].map(csvCell).join(";")
    )
    // BOM + semicolons so Excel in French opens it correctly
    const csv = "﻿" + [header.join(";"), ...lines].join("\r\n")
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventaire-imei-${date}.csv"`,
      },
    })
  }

  const page = Math.max(1, Number(params.get("page")) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const { data, error, count } = await unitsQuery(supabase, params).range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    rows: (data || []).map(toRow),
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  })
}

// POST /api/inventory/units — stock reception
// { variation_id, supplier, purchase_price, units: [{ imei, imei2 }] }
// All rows are validated again here, then inserted in one call.
// The database trigger updates product_variations.stock.
export async function POST(request: Request) {
  const { denied } = await authorize("inventory.imei")
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await request.json().catch(() => ({}))

  const variationId = typeof body.variation_id === "string" ? body.variation_id : ""
  const supplier = typeof body.supplier === "string" ? body.supplier.trim().slice(0, 120) || null : null
  const purchasePrice = Number(body.purchase_price)
  const units: { imei: string; imei2: string | null }[] = Array.isArray(body.units)
    ? body.units.map((u: any) => ({
        imei: String(u?.imei ?? "").trim(),
        imei2: u?.imei2 ? String(u.imei2).trim() : null,
      }))
    : []

  if (!variationId) {
    return NextResponse.json({ error: "Choisissez une variante" }, { status: 400 })
  }
  if (body.purchase_price === "" || body.purchase_price == null || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return NextResponse.json({ error: "Prix d'achat invalide" }, { status: 400 })
  }
  if (units.length === 0) {
    return NextResponse.json({ error: "Aucun IMEI à enregistrer" }, { status: 400 })
  }

  const { data: variation } = await supabase
    .from("product_variations")
    .select("id")
    .eq("id", variationId)
    .maybeSingle()
  if (!variation) {
    return NextResponse.json({ error: "Variante introuvable" }, { status: 404 })
  }

  // Format and duplicates inside the batch
  const invalid: Record<string, string> = {}
  const seen = new Set<string>()
  for (const unit of units) {
    for (const value of [unit.imei, unit.imei2]) {
      if (value == null) continue
      const formatError = imeiFormatError(value)
      if (formatError) invalid[value] = formatError
      else if (seen.has(value)) invalid[value] = "IMEI en double dans la liste"
      seen.add(value)
    }
  }

  // Already in the database
  const { existing, error: checkError } = await findExistingImeis(supabase, [...seen])
  if (checkError) {
    return NextResponse.json({ error: checkError }, { status: 500 })
  }
  for (const value of existing) invalid[value] = "IMEI déjà enregistré"

  if (Object.keys(invalid).length > 0) {
    return NextResponse.json({ error: "Certains IMEI sont invalides", invalid }, { status: 409 })
  }

  const { error } = await supabase.from("device_units").insert(
    units.map((u) => ({
      variation_id: variationId,
      imei: u.imei,
      imei2: u.imei2,
      status: "in_stock",
      purchase_price: purchasePrice,
      supplier,
    }))
  )

  if (error) {
    const message = error.code === "23505" ? "Un IMEI vient d'être enregistré par quelqu'un d'autre, vérifiez la liste" : error.message
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 })
  }

  const { data: updated } = await supabase
    .from("product_variations")
    .select("stock")
    .eq("id", variationId)
    .single()

  return NextResponse.json({ inserted: units.length, stock: updated?.stock ?? null })
}
