import { authorize, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkItemPrices, createOrderWithItems, type OrderItemInput } from "@/lib/orders/create-order"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "")

/** "+212 6 12 34 56 78" / "00212612345678" / "06.12.34.56.78" -> "0612345678" */
function normalizePhone(value: unknown) {
  let phone = text(value, 30).replace(/[\s.()-]/g, "")
  if (phone.startsWith("+212")) phone = `0${phone.slice(4)}`
  else if (phone.startsWith("00212")) phone = `0${phone.slice(5)}`
  return phone
}

// POST /api/orders/manual — order taken on WhatsApp (prices are hidden on the website)
// The total is computed here from the items; the client total is never trusted.
export async function POST(request: Request) {
  const { denied, userId } = await authorize("products:write")
  if (denied) return denied

  const body = await request.json().catch(() => null)
  const fieldErrors: Record<string, string> = {}

  const full_name = text(body?.full_name, 120)
  const phone = normalizePhone(body?.phone)
  const city = text(body?.city, 80)
  const address = text(body?.address, 300)
  const email = text(body?.email, 160) || null
  const notes = text(body?.notes, 1000) || null

  if (full_name.length < 2) fieldErrors.full_name = "Le nom est obligatoire"
  if (!/^0[5-8]\d{8}$/.test(phone)) fieldErrors.phone = "Numéro de téléphone invalide (ex. 0612345678)"
  if (city.length < 2) fieldErrors.city = "La ville est obligatoire"
  if (address.length < 3) fieldErrors.address = "L'adresse est obligatoire"
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "E-mail invalide"

  const rawItems: any[] = Array.isArray(body?.items) ? body.items : []
  const items: OrderItemInput[] = []
  const itemErrors: Record<number, string> = {}
  rawItems.slice(0, 50).forEach((item, i) => {
    const quantity = Number(item?.quantity)
    const unitPrice = Number(item?.unit_price)
    if (typeof item?.variation_id !== "string" || !UUID.test(item.variation_id)) {
      itemErrors[i] = "Choisissez un produit et une variante"
    } else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      itemErrors[i] = "Quantité invalide"
    } else if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      itemErrors[i] = "Prix unitaire invalide"
    } else {
      items.push({ variation_id: item.variation_id, quantity, unit_price: Math.round(unitPrice * 100) / 100 })
    }
  })
  if (rawItems.length === 0) fieldErrors.items = "Ajoutez au moins un article"

  if (Object.keys(fieldErrors).length > 0 || Object.keys(itemErrors).length > 0) {
    return NextResponse.json({ error: "Corrigez les erreurs du formulaire", fieldErrors, itemErrors }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Unknown variations, variations without price (price <= 0) and unit prices <= 0 are rejected
  const priceError = await checkItemPrices(supabase, items)
  if (priceError) {
    return NextResponse.json({ error: priceError.error, itemErrors: { [priceError.index]: priceError.error } }, { status: 400 })
  }

  const total = Math.round(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * 100) / 100

  const { order, error } = await createOrderWithItems(
    supabase,
    {
      full_name,
      phone,
      city,
      address,
      email,
      notes,
      total_amount: total,
      // orders.confirmation_status only accepts pending | paid | return:
      // the confirmation of a WhatsApp order is stored in orders.status
      status: "confirmed",
      delivery_status: "En attente",
      assigned_to: userId,
      utm_source: "whatsapp",
    },
    items
  )

  if (error || !order) {
    return NextResponse.json({ error: error || "Commande non créée" }, { status: 500 })
  }

  await supabase.from("order_activity").insert({
    order_id: order.id,
    user_id: userId,
    action: "created_manually",
    new_value: "whatsapp",
    note: "Commande WhatsApp créée depuis le tableau de bord",
  })

  return NextResponse.json({ id: order.id, order_number: order.order_number, total_amount: total })
}
