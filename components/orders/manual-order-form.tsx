"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconAlertTriangle, IconArrowLeft, IconBrandWhatsapp, IconCheck, IconPlus, IconSelector, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatVariationLabel, isSmartphoneCategory } from "@/lib/products/smartphone"

interface SearchVariation {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  storage_gb: number | null
  ram_gb: number | null
  condition: string | null
  price: number
  stock: number
  is_active: boolean
}

interface SearchProduct {
  id: string
  name: string
  thumbnail_url: string | null
  categories: { slug: string } | null
  product_variations: SearchVariation[]
}

interface ItemDraft {
  key: string
  product_id: string
  variation_id: string
  quantity: string
  unit_price: string
}

type FieldKey = "full_name" | "phone" | "city" | "address" | "email" | "notes"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

const emptyItem = (): ItemDraft => ({ key: crypto.randomUUID(), product_id: "", variation_id: "", quantity: "1", unit_price: "" })

function variationText(product: SearchProduct | undefined, v: SearchVariation) {
  if (isSmartphoneCategory(product?.categories?.slug)) return formatVariationLabel(v) || v.sku || "—"
  return [v.color, v.size].filter(Boolean).join(" · ") || v.sku || "—"
}

function ItemRow({
  item,
  index,
  products,
  loadingProducts,
  error,
  onChange,
  onRemove,
  canRemove,
}: {
  item: ItemDraft
  index: number
  products: SearchProduct[]
  loadingProducts: boolean
  error?: string
  onChange: (patch: Partial<ItemDraft>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const t = useTranslations("manualOrder")
  const [open, setOpen] = React.useState(false)
  const product = products.find((p) => p.id === item.product_id)
  const variation = product?.product_variations.find((v) => v.id === item.variation_id)
  const quantity = Number(item.quantity) || 0
  const lineTotal = quantity * (Number(item.unit_price) || 0)

  return (
    <div className="relative grid gap-3 rounded-md border bg-muted/40 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("itemNumber", { number: index + 1 })}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <IconTrash className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("product")} *</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={loadingProducts}>
                <span className="truncate">{product ? product.name : loadingProducts ? t("loading") : t("selectProduct")}</span>
                <IconSelector className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("searchProduct")} />
                <CommandList>
                  <CommandEmpty>{t("noProduct")}</CommandEmpty>
                  <CommandGroup>
                    {products.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.id}`}
                        onSelect={() => {
                          onChange({ product_id: p.id, variation_id: "", unit_price: "" })
                          setOpen(false)
                        }}
                      >
                        <IconCheck className={cn("size-4", item.product_id === p.id ? "opacity-100" : "opacity-0")} />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>{t("variation")} *</Label>
          <Select
            disabled={!product || product.product_variations.length === 0}
            value={item.variation_id}
            onValueChange={(val) => {
              const v = product?.product_variations.find((x) => x.id === val)
              onChange({ variation_id: val, unit_price: v ? String(v.price) : item.unit_price })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectVariation")} />
            </SelectTrigger>
            <SelectContent>
              {product?.product_variations.filter((v) => v.is_active).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {variationText(product, v)} — {v.price} DH · {t("stockShort", { stock: v.stock })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("quantity")}</Label>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("unitPrice")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={item.unit_price}
            onChange={(e) => onChange({ unit_price: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-2 md:col-span-1">
          <Label>{t("lineTotal")}</Label>
          <p className="flex h-9 items-center font-medium tabular-nums">{lineTotal.toFixed(2)} DH</p>
        </div>
      </div>

      {variation && (
        <p className={cn("flex items-center gap-1 text-sm", quantity > variation.stock ? "text-amber-600" : "text-muted-foreground")}>
          {quantity > variation.stock && <IconAlertTriangle className="size-4" />}
          {quantity > variation.stock
            ? t("stockWarning", { stock: variation.stock })
            : t("stockAvailable", { stock: variation.stock })}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function ManualOrderForm() {
  const t = useTranslations("manualOrder")
  const router = useRouter()
  const { data: products = [], isLoading: loadingProducts } = useSWR<SearchProduct[]>("/api/products/search", fetcher)

  const [fields, setFields] = React.useState<Record<FieldKey, string>>({
    full_name: "",
    phone: "",
    city: "",
    address: "",
    email: "",
    notes: "",
  })
  const [items, setItems] = React.useState<ItemDraft[]>([emptyItem()])
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [itemErrors, setItemErrors] = React.useState<Record<number, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const setField = (key: FieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: "" }))
  }

  const estimatedTotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const localItemErrors: Record<number, string> = {}
    items.forEach((item, i) => {
      if (!item.variation_id) localItemErrors[i] = t("errors.variationRequired")
      else if (!(Number(item.quantity) >= 1)) localItemErrors[i] = t("errors.quantity")
      else if (item.unit_price === "" || Number(item.unit_price) < 0) localItemErrors[i] = t("errors.unitPrice")
    })
    setItemErrors(localItemErrors)
    if (Object.keys(localItemErrors).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          items: items.map((i) => ({
            variation_id: i.variation_id,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFieldErrors(data.fieldErrors || {})
        setItemErrors(data.itemErrors || {})
        toast.error(data.error || t("errors.createFailed"))
        return
      }
      toast.success(t("created", { number: data.order_number }))
      // Open the new order
      router.push(`/dashboard/orders/${data.id}`)
    } catch {
      toast.error(t("errors.createFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: FieldKey, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={fields[key]}
        onChange={(e) => setField(key, e.target.value)}
        aria-invalid={!!fieldErrors[key]}
        {...props}
      />
      {fieldErrors[key] && <p className="text-sm text-destructive">{fieldErrors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" onClick={() => router.back()}>
          <IconArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <IconBrandWhatsapp className="size-6 text-green-600" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("customer")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("full_name", `${t("fullName")} *`, { autoComplete: "off" })}
              {field("phone", `${t("phone")} *`, { type: "tel", inputMode: "tel", placeholder: "06 12 34 56 78" })}
              {field("city", `${t("city")} *`)}
              {field("email", t("email"), { type: "email" })}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">{t("address")} *</Label>
                <Textarea
                  id="address"
                  value={fields.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className="min-h-[60px]"
                  aria-invalid={!!fieldErrors.address}
                />
                {fieldErrors.address && <p className="text-sm text-destructive">{fieldErrors.address}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("items")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <ItemRow
                  key={item.key}
                  item={item}
                  index={index}
                  products={products}
                  loadingProducts={loadingProducts}
                  error={itemErrors[index]}
                  canRemove={items.length > 1}
                  onChange={(patch) => {
                    setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, ...patch } : i)))
                    setItemErrors((prev) => ({ ...prev, [index]: "" }))
                  }}
                  onRemove={() => {
                    setItems((prev) => prev.filter((i) => i.key !== item.key))
                    setItemErrors({})
                  }}
                />
              ))}
              {fieldErrors.items && <p className="text-sm text-destructive">{fieldErrors.items}</p>}
              <Button type="button" variant="outline" className="w-full" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
                <IconPlus className="size-4" />
                {t("addItem")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("total")}</span>
                <span className="text-xl font-semibold tabular-nums">{estimatedTotal.toFixed(2)} DH</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("totalHint")}</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• {t("sourceWhatsapp")}</li>
                <li>• {t("statusConfirmed")}</li>
                <li>• {t("assignedToYou")}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fields.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Spinner className="mr-1" />}
            {t("create")}
          </Button>
        </div>
      </div>
    </form>
  )
}
