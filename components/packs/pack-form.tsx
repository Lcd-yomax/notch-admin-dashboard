"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { IconAlertTriangle, IconCheck, IconPlus, IconSelector, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { DialogFooter } from "@/components/ui/dialog"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn, slugify } from "@/lib/utils"
import { computePackPricing } from "@/lib/packs/pricing"
import { formatVariationLabel } from "@/lib/products/smartphone"

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
  hide_price: boolean
  product_variations: SearchVariation[]
}

export interface PackRow {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  discount_percent: number
  is_active: boolean
  sort_order: number
  pack_items: {
    variation_id: string
    quantity: number
    product_variations: (SearchVariation & { products: { id: string; name: string; thumbnail_url: string | null; is_active: boolean; hide_price: boolean } | null }) | null
  }[]
  pricing: {
    originalPrice: number
    packPrice: number
    saving: number
    hidePrice: boolean
    issues: string[]
  }
}

interface ItemDraft {
  key: string
  product_id: string
  variation_id: string
  quantity: string
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

function variationText(v: SearchVariation) {
  return formatVariationLabel(v) || v.sku || "—"
}

function ItemPicker({
  item,
  products,
  onChange,
  onRemove,
}: {
  item: ItemDraft
  products: SearchProduct[]
  onChange: (patch: Partial<ItemDraft>) => void
  onRemove: () => void
}) {
  const t = useTranslations("packs")
  const [open, setOpen] = React.useState(false)
  const product = products.find((p) => p.id === item.product_id)

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[1.4fr_1.4fr_80px_auto] sm:items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="col-span-2 w-full justify-between font-normal sm:col-span-1">
            <span className="truncate">{product ? product.name : t("selectProduct")}</span>
            <IconSelector className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
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
                      const active = p.product_variations.filter((v) => v.is_active)
                      onChange({ product_id: p.id, variation_id: active.length === 1 ? active[0].id : "" })
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
      <Select
        value={item.variation_id}
        onValueChange={(val) => onChange({ variation_id: val })}
        disabled={!product}
      >
        <SelectTrigger className="col-span-2 w-full sm:col-span-1">
          <SelectValue placeholder={t("selectVariation")} />
        </SelectTrigger>
        <SelectContent>
          {product?.product_variations.filter((v) => v.is_active).map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {variationText(v)} — {v.price} DH
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min="1"
        max="20"
        inputMode="numeric"
        value={item.quantity}
        onChange={(e) => onChange({ quantity: e.target.value })}
        aria-label={t("quantity")}
      />
      <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={t("removeItem")}>
        <IconTrash className="size-4" />
      </Button>
    </div>
  )
}

export function PackForm({
  pack,
  onSaved,
  onCancel,
}: {
  pack?: PackRow | null
  onSaved: (result: { blockers: string[] }) => void
  onCancel: () => void
}) {
  const t = useTranslations("packs")
  const tc = useTranslations("common")
  const { data: products = [], isLoading: loadingProducts } = useSWR<SearchProduct[]>("/api/products/search", fetcher)

  const [name, setName] = React.useState(pack?.name || "")
  const [slug, setSlug] = React.useState(pack?.slug || "")
  const [slugTouched, setSlugTouched] = React.useState(!!pack)
  const [description, setDescription] = React.useState(pack?.description || "")
  const [imageUrl, setImageUrl] = React.useState(pack?.image_url || "")
  const [discount, setDiscount] = React.useState(pack ? String(pack.discount_percent) : "10")
  const [isActive, setIsActive] = React.useState(pack?.is_active ?? true)
  const [items, setItems] = React.useState<ItemDraft[]>(() =>
    pack?.pack_items.length
      ? pack.pack_items.map((i) => ({
          key: crypto.randomUUID(),
          product_id: i.product_variations?.products?.id || "",
          variation_id: i.variation_id,
          quantity: String(i.quantity),
        }))
      : [{ key: crypto.randomUUID(), product_id: "", variation_id: "", quantity: "1" }]
  )
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Live price preview (the server computes the real price again)
  const preview = computePackPricing(
    items
      .filter((i) => i.variation_id)
      .map((i) => {
        const product = products.find((p) => p.id === i.product_id)
        const variation = product?.product_variations.find((v) => v.id === i.variation_id) ?? null
        return { quantity: Number(i.quantity) || 0, variation, product: product ? { name: product.name, is_active: true, hide_price: product.hide_price } : null }
      }),
    Number(discount) || 0
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) setImageUrl(data.url)
      else setErrors((prev) => ({ ...prev, form: data.error || t("uploadError") }))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(pack ? `/api/packs/${pack.id}` : "/api/packs", {
        method: pack ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          image_url: imageUrl || null,
          discount_percent: Number(discount),
          is_active: isActive,
          sort_order: pack?.sort_order ?? 0,
          items: items.filter((i) => i.variation_id || i.product_id).map((i) => ({ variation_id: i.variation_id, quantity: Number(i.quantity) })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors({ ...(data.fieldErrors || {}), form: data.error || t("saveError") })
        return
      }
      onSaved({ blockers: data.blockers || [] })
    } catch {
      setErrors({ form: t("saveError") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pack-name">{t("name")} *</Label>
          <Input
            id="pack-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!slugTouched) setSlug(slugify(e.target.value))
            }}
            placeholder={t("namePlaceholder")}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pack-slug">{t("slug")} *</Label>
          <Input
            id="pack-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            aria-invalid={!!errors.slug}
          />
          {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pack-description">{t("description")}</Label>
        <Textarea
          id="pack-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          <Label>{t("image")}</Label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex size-28 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 text-xs text-muted-foreground hover:border-primary/50"
          >
            {uploading ? <Spinner /> : imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : t("uploadImage")}
          </button>
          {imageUrl && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setImageUrl("")}>
              {tc("delete")}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pack-discount">{t("discount")} *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pack-discount"
                type="number"
                min="0"
                max="99"
                step="0.5"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28"
                aria-invalid={!!errors.discount_percent}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {errors.discount_percent && <p className="text-sm text-destructive">{errors.discount_percent}</p>}
          </div>
          <div className="flex items-start gap-2">
            <Switch id="pack-active" checked={isActive} onCheckedChange={setIsActive} className="mt-0.5" />
            <div>
              <Label htmlFor="pack-active">{t("showOnWebsite")}</Label>
              <p className="text-xs text-muted-foreground">{t("activeHint")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("items")} *</Label>
          {loadingProducts && <Spinner />}
        </div>
        {items.map((item) => (
          <ItemPicker
            key={item.key}
            item={item}
            products={products}
            onChange={(patch) => setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, ...patch } : i)))}
            onRemove={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
          />
        ))}
        {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems((prev) => [...prev, { key: crypto.randomUUID(), product_id: "", variation_id: "", quantity: "1" }])}
        >
          <IconPlus className="size-3.5" />
          {t("addItem")}
        </Button>
      </div>

      <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("originalPrice")}</span>
          <span className="tabular-nums line-through">{preview.originalPrice.toFixed(2)} DH</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>{t("packPrice")}</span>
          <span className="tabular-nums">{preview.packPrice.toFixed(2)} DH</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>{t("saving")}</span>
          <span className="tabular-nums">-{preview.saving.toFixed(2)} DH</span>
        </div>
        {preview.hidePrice && (
          <p className="flex items-start gap-1 pt-1 text-xs text-amber-600">
            <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {t("hiddenPriceWarning")}
          </p>
        )}
      </div>

      {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Spinner className="mr-1" />}
          {pack ? t("update") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  )
}
