"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconCheck, IconCloudDownload, IconPlus, IconRefresh, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/rich-text-editor"
import { BrandForm, type Brand } from "@/components/brands/brand-form"
import { ProductImagesEditor } from "@/components/products/product-images-editor"
import { SpecsEditor } from "@/components/products/specs-editor"
import { VariationsEditor, type VariationErrors } from "@/components/products/variations-editor"
import {
  VariantGeneratorDialog,
  type ImportedVariants,
} from "@/components/products/variant-generator-dialog"
import {
  MobileApiImportDialog,
  type MobileApiApplyResult,
} from "@/components/products/mobileapi-import-dialog"
import { usePermissions } from "@/hooks/use-permissions"
import { cn, slugify } from "@/lib/utils"
import {
  emptySpec,
  emptyVariation,
  imagesToDrafts,
  newKey,
  orderSpecs,
  toNumberOrNull,
  type ImageDraft,
  type SaveProductPayload,
  type SaveProductResult,
  type SaveStep,
  type SpecDraft,
  type VariationDraft,
} from "@/lib/products/form"
import { isSmartphoneCategory, sameText, type PhoneCondition } from "@/lib/products/smartphone"

export interface ProductFormCategory {
  id: string
  name: string
  slug: string
}

interface LoadedProduct {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
  brand_id: string | null
  hide_price: boolean
  is_active: boolean
  is_featured: boolean
  is_best_seller: boolean
  mobileapi_device_id?: string | null
  product_variations: {
    id: string
    sku: string
    color: string | null
    size: string | null
    storage_gb: number | null
    ram_gb: number | null
    condition: PhoneCondition | null
    warranty_months: number | null
    price: number
    price_display: number | null
    discount_label: string | null
    stock: number
    is_active: boolean
  }[]
  product_images: { id: string; url: string; variation_id: string | null; sort_order: number }[]
  product_specs: { group_name: string; label: string; value: string; label_ar: string | null; value_ar: string | null; sort_order: number }[]
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

const str = (value: number | string | null | undefined) => (value == null ? "" : String(value))

export function ProductForm({
  productId,
  categories,
  onSaved,
  onCancel,
}: {
  productId?: string | null
  categories: ProductFormCategory[]
  onSaved: (productId: string) => void
  onCancel: () => void
}) {
  const tc = useTranslations("common")
  const { data: product, error } = useSWR<LoadedProduct>(productId ? `/api/products/${productId}` : null, fetcher, {
    revalidateOnFocus: false,
  })

  if (productId && error) {
    return <p className="py-8 text-center text-sm text-destructive">{error.message}</p>
  }
  if (productId && !product) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        {tc("loading")}
      </div>
    )
  }

  return <ProductFormInner product={product} categories={categories} onSaved={onSaved} onCancel={onCancel} />
}

function ProductFormInner({
  product,
  categories,
  onSaved,
  onCancel,
}: {
  product?: LoadedProduct
  categories: ProductFormCategory[]
  onSaved: (productId: string) => void
  onCancel: () => void
}) {
  const t = useTranslations("products")
  const tf = useTranslations("productForm")
  const tb = useTranslations("brands")
  const tc = useTranslations("common")
  const { hasPermission } = usePermissions()
  const canManageBrands = hasPermission("brands.manage")
  const { data: brands = [], mutate: mutateBrands } = useSWR<Brand[]>("/api/brands", fetcher)

  // ── Product fields ──────────────────────────────────────────────────────────
  const [savedProductId, setSavedProductId] = React.useState<string | null>(product?.id || null)
  const [name, setName] = React.useState(product?.name || "")
  const [slug, setSlug] = React.useState(product?.slug || "")
  const [slugTouched, setSlugTouched] = React.useState(!!product)
  const [description, setDescription] = React.useState(product?.description || "")
  const [categoryId, setCategoryId] = React.useState(product?.category_id || "")
  const [brandId, setBrandId] = React.useState(product?.brand_id || "")
  const [pendingBrand, setPendingBrand] = React.useState<{ name: string; slug: string } | null>(null)
  const [hidePrice, setHidePrice] = React.useState(product?.hide_price ?? false)
  const [isActive, setIsActive] = React.useState(product?.is_active ?? true)
  const [isFeatured, setIsFeatured] = React.useState(product?.is_featured ?? false)
  const [isBestSeller, setIsBestSeller] = React.useState(product?.is_best_seller ?? false)
  const initialDeviceId = product?.mobileapi_device_id ?? null
  const [mobileapiDeviceId, setMobileapiDeviceId] = React.useState<string | null>(initialDeviceId)

  // ── Variations, images, specs ───────────────────────────────────────────────
  const [variations, setVariations] = React.useState<VariationDraft[]>(() =>
    (product?.product_variations || []).map((v) =>
      emptyVariation({
        id: v.id,
        sku: v.sku,
        color: v.color || "",
        size: v.size || "",
        storage_gb: str(v.storage_gb),
        ram_gb: str(v.ram_gb),
        condition: v.condition || "neuf",
        warranty_months: str(v.warranty_months),
        price: str(v.price),
        price_display: str(v.price_display),
        discount_label: v.discount_label || "",
        stock: str(v.stock),
        stock_original: str(v.stock),
        is_active: v.is_active,
      })
    )
  )
  const [images, setImages] = React.useState<ImageDraft[]>(() =>
    imagesToDrafts(product?.product_images || [], product?.product_variations || [])
  )
  const [specs, setSpecs] = React.useState<SpecDraft[]>(() =>
    [...(product?.product_specs || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) =>
        emptySpec({
          group_name: s.group_name,
          label: s.label,
          value: s.value,
          label_ar: s.label_ar || "",
          value_ar: s.value_ar || "",
        })
      )
  )

  // ── UI state ────────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = React.useState<SaveProductResult["field_errors"]>({})
  const [variationErrors, setVariationErrors] = React.useState<VariationErrors>({})
  const [report, setReport] = React.useState<SaveStep[] | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [brandDialogOpen, setBrandDialogOpen] = React.useState(false)
  const [generator, setGenerator] = React.useState<{ open: boolean; mode: "manual" | "import" }>({ open: false, mode: "manual" })
  const [importedVariants, setImportedVariants] = React.useState<ImportedVariants | null>(null)
  const [importDialog, setImportDialog] = React.useState<{ open: boolean; deviceId: string | null }>({ open: false, deviceId: null })

  const category = categories.find((c) => c.id === categoryId)
  const isSmartphone = isSmartphoneCategory(category?.slug)
  const brandName = pendingBrand?.name || brands.find((b) => b.id === brandId)?.name || null
  const variationColors = [...new Set(variations.filter((v) => !v.deleted && v.color.trim()).map((v) => v.color.trim()))]

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleCategoryChange = (value: string) => {
    const next = categories.find((c) => c.id === value)
    // Prices of smartphones are hidden on the website by default (still editable)
    if (isSmartphoneCategory(next?.slug) && !isSmartphone) setHidePrice(true)
    setCategoryId(value)
  }

  // "Appliquer" only fills the form: nothing is saved until the normal save button
  const handleImportApply = (result: MobileApiApplyResult) => {
    setMobileapiDeviceId(result.deviceId)

    if (result.brand?.kind === "existing") {
      setPendingBrand(null)
      setBrandId(result.brand.id)
    } else if (result.brand?.kind === "new") {
      setPendingBrand({ name: result.brand.name, slug: slugify(result.brand.name) })
    }

    if (result.specs) {
      const imported = result.specs.rows.map((row) =>
        emptySpec({ group_name: row.group_name, label: row.label, value: row.value })
      )
      if (result.specs.mode === "replace") {
        setSpecs(imported)
      } else {
        // Fill empty values and add missing rows, never overwrite a filled value
        setSpecs((prev) => {
          const next = orderSpecs(prev).map((s) => ({ ...s }))
          for (const row of imported) {
            const existing = next.find((s) => sameText(s.group_name, row.group_name) && sameText(s.label, row.label))
            if (existing) {
              if (!existing.value.trim()) existing.value = row.value
              continue
            }
            let index = -1
            next.forEach((s, i) => {
              if (sameText(s.group_name, row.group_name)) index = i
            })
            if (index === -1) next.push(row)
            else next.splice(index + 1, 0, row)
          }
          return next
        })
      }
    }

    if (result.variants) {
      setImportedVariants(result.variants)
      if (result.openGenerator) setGenerator({ open: true, mode: "import" })
    }
    toast.success(tf("importApplied"))
  }

  const validate = () => {
    const errors: SaveProductResult["field_errors"] = {}
    if (!name.trim()) errors.name = tf("nameRequired")
    if (!slug.trim()) errors.slug = tf("slugRequired")

    const rowErrors: VariationErrors = {}
    const seen = new Set<string>()
    for (const v of variations) {
      if (v.deleted) continue
      const e: VariationErrors[string] = {}
      const sku = v.sku.trim().toLowerCase()
      if (!sku) e.sku = tf("skuRequired")
      else if (seen.has(sku)) e.sku = tf("skuDuplicate")
      seen.add(sku)
      const price = toNumberOrNull(v.price)
      if (price == null || price < 0) e.price = tf("priceRequired")
      if (Object.keys(e).length > 0) rowErrors[v.key] = e
    }
    setFieldErrors(errors)
    setVariationErrors(rowErrors)
    return Object.keys(errors).length === 0 && Object.keys(rowErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReport(null)
    if (!validate()) {
      toast.error(tf("fixErrors"))
      return
    }

    setSaving(true)
    try {
      // 1. Upload new images (same flow as before: /api/upload returns a public URL)
      const uploadFailures: string[] = []
      const uploaded = await Promise.all(
        images.map(async (img) => {
          if (!img.file) return img
          const formData = new FormData()
          formData.append("file", img.file)
          const res = await fetch("/api/upload", { method: "POST", body: formData }).catch(() => null)
          const data = res?.ok ? await res.json() : null
          if (!data?.url) {
            uploadFailures.push(img.file.name)
            return img
          }
          return { ...img, url: data.url as string, file: undefined }
        })
      )
      setImages(uploaded)

      // 2. Save everything on the server
      const activeRows = variations.filter((v) => !v.deleted)
      const payload: SaveProductPayload = {
        product_id: savedProductId || undefined,
        product: {
          name,
          slug,
          description: description || null,
          category_id: categoryId || null,
          brand_id: pendingBrand ? null : brandId || null,
          hide_price: hidePrice,
          is_active: isActive,
          is_featured: isFeatured,
          is_best_seller: isBestSeller,
          ...(mobileapiDeviceId !== initialDeviceId ? { mobileapi_device_id: mobileapiDeviceId } : {}),
        },
        new_brand: pendingBrand,
        variations: activeRows.map((v) => ({
          id: v.id,
          sku: v.sku.trim(),
          color: v.color.trim() || null,
          size: v.size.trim() || null,
          storage_gb: toNumberOrNull(v.storage_gb),
          ram_gb: toNumberOrNull(v.ram_gb),
          condition: v.condition,
          warranty_months: toNumberOrNull(v.warranty_months),
          price: toNumberOrNull(v.price) ?? 0,
          price_display: toNumberOrNull(v.price_display),
          discount_label: v.discount_label.trim() || null,
          ...(isSmartphone
            ? {}
            : { stock: toNumberOrNull(v.stock) ?? 0, stock_original: v.stock_original != null ? toNumberOrNull(v.stock_original) ?? 0 : undefined }),
          is_active: v.is_active,
        })),
        deleted_variation_ids: variations.filter((v) => v.deleted && v.id).map((v) => v.id as string),
        images: uploaded.filter((img) => img.url).map((img) => ({ url: img.url, color: img.color, custom: img.custom })),
        ...(canManageBrands
          ? {
              specs: orderSpecs(specs)
                .filter((s) => s.group_name.trim() && s.label.trim() && s.value.trim())
                .map((s, i) => ({
                  group_name: s.group_name,
                  label: s.label,
                  value: s.value,
                  label_ar: s.label_ar || null,
                  value_ar: s.value_ar || null,
                  sort_order: i,
                })),
            }
          : {}),
      }

      const res = await fetch("/api/products/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = (await res.json()) as SaveProductResult & { error?: string }

      if (!result.steps) {
        setReport([{ key: "product", status: "failed", message: result.error || tf("saveFailed") }])
        return
      }

      // 3. Keep what was saved so a retry updates instead of duplicating
      if (result.product_id) setSavedProductId(result.product_id)
      if (result.brand_id) {
        setBrandId(result.brand_id)
        setPendingBrand(null)
        mutateBrands()
      }
      const savedVariationsStep = result.steps.find((s) => s.key === "variations")
      setVariations((prev) => {
        const active = prev.filter((v) => !v.deleted)
        const ids = new Map(active.map((v, i) => [v.key, result.variation_ids[i]]))
        return prev
          .filter((v) => !(v.deleted && savedVariationsStep?.status === "saved"))
          .map((v) => {
            const id = ids.get(v.key)
            return id ? { ...v, id, stock_original: v.stock } : v
          })
      })
      setFieldErrors(result.field_errors || {})
      setVariationErrors(
        Object.fromEntries(
          Object.entries(result.variation_errors || {}).map(([index, err]) => [activeRows[Number(index)]?.key, err])
        )
      )

      const steps = [...result.steps]
      if (uploadFailures.length > 0) {
        steps.push({ key: "images", status: "failed", message: tf("uploadFailed", { files: uploadFailures.join(", ") }) })
      }

      if (result.ok && uploadFailures.length === 0 && result.product_id) {
        toast.success(product ? t("updateSuccess") : t("createSuccess"))
        onSaved(result.product_id)
      } else {
        setReport(steps)
        toast.error(tf("partialSave"))
      }
    } catch {
      setReport([{ key: "product", status: "failed", message: tf("saveFailed") }])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      {/* ── MobileAPI import (smartphones only) ─────────────────────────── */}
      {isSmartphone && canManageBrands && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <p className="me-auto text-sm text-muted-foreground">
            {mobileapiDeviceId ? tf("importLinked", { id: mobileapiDeviceId }) : tf("importHint")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportDialog({ open: true, deviceId: null })}
          >
            <IconCloudDownload className="size-4" />
            {tf("importFromMobileApi")}
          </Button>
          {mobileapiDeviceId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportDialog({ open: true, deviceId: mobileapiDeviceId })}
            >
              <IconRefresh className="size-4" />
              {tf("updateFromMobileApi")}
            </Button>
          )}
        </div>
      )}

      {/* ── General information ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t("productName")} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("enterProductName")}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("slug")} *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              placeholder={t("productSlug")}
              aria-invalid={!!fieldErrors.slug}
            />
            {fieldErrors.slug && <p className="text-sm text-destructive">{fieldErrors.slug}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">{t("category")}</Label>
            <Select value={categoryId || "none"} onValueChange={(val) => handleCategoryChange(val === "none" ? "" : val)}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noCategory")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">{tf("brand")}</Label>
            <div className="flex gap-2">
              <Select
                value={pendingBrand ? "__pending__" : brandId || "none"}
                onValueChange={(val) => {
                  if (val === "__pending__") return
                  setPendingBrand(null)
                  setBrandId(val === "none" ? "" : val)
                }}
              >
                <SelectTrigger id="brand" className="w-full" aria-invalid={!!fieldErrors.brand}>
                  <SelectValue placeholder={tf("selectBrand")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tf("noBrand")}</SelectItem>
                  {pendingBrand && (
                    <SelectItem value="__pending__">{tf("pendingBrand", { name: pendingBrand.name })}</SelectItem>
                  )}
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageBrands && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setBrandDialogOpen(true)}
                  title={tb("newBrand")}
                >
                  <IconPlus className="size-4" />
                  <span className="hidden sm:inline">{tb("newBrand").replace("+ ", "")}</span>
                </Button>
              )}
            </div>
            {fieldErrors.brand && <p className="text-sm text-destructive">{fieldErrors.brand}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("productDescription")}</Label>
          <RichTextEditor
            content={description}
            onChange={setDescription}
            placeholder={t("enterProductDescription")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is_active">{tf("showOnWebsite")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label htmlFor="is_featured">{t("isFeatured")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_best_seller" checked={isBestSeller} onCheckedChange={setIsBestSeller} />
            <Label htmlFor="is_best_seller">{t("isBestSeller")}</Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{tf("showOnWebsiteHelp")}</p>
        {isActive && !product?.is_active && (
          <p className="text-xs text-muted-foreground">{tf("activeHint")}</p>
        )}
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Switch id="hide_price" checked={hidePrice} onCheckedChange={setHidePrice} className="mt-0.5" />
          <div>
            <Label htmlFor="hide_price">{tf("hidePrice")}</Label>
            <p className="text-xs text-muted-foreground">{tf("hidePriceHelp")}</p>
          </div>
        </div>
      </section>

      <Separator />

      <ProductImagesEditor images={images} onChange={setImages} colors={variationColors} />

      <Separator />

      <VariationsEditor
        rows={variations}
        onChange={setVariations}
        isSmartphone={isSmartphone}
        errors={variationErrors}
        canDelete={hasPermission("products:delete")}
        canManageInventory={hasPermission("inventory.imei")}
        onGenerate={() => setGenerator({ open: true, mode: importedVariants ? "import" : "manual" })}
      />

      {canManageBrands && (
        <>
          <Separator />
          <SpecsEditor rows={specs} onChange={setSpecs} />
        </>
      )}

      {report && (
        <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm font-medium">{tf("saveReportTitle")}</p>
          <ul className="space-y-1">
            {report.map((step, i) => (
              <li key={`${step.key}-${i}`} className="flex items-start gap-2 text-sm">
                {step.status === "saved" ? (
                  <IconCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
                ) : (
                  <IconX className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <span>
                  <span className="font-medium">{tf(`steps.${step.key}`)}</span>
                  {" : "}
                  <span className={cn(step.status !== "saved" && "text-destructive")}>
                    {step.status === "saved"
                      ? tf("stepSaved")
                      : step.key === "activation"
                        ? tf("stepNotActivated")
                        : tf("stepNotSaved")}
                  </span>
                  {step.message && <span className="block text-xs text-muted-foreground">{step.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t bg-background px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Spinner className="mr-1" />}
          {savedProductId ? t("updateProduct") : t("createProduct")}
        </Button>
      </DialogFooter>

      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tb("createBrand")}</DialogTitle>
            <DialogDescription>{tb("createBrandDesc")}</DialogDescription>
          </DialogHeader>
          {brandDialogOpen && (
            <BrandForm
              onSaved={(brand) => {
                mutateBrands()
                setPendingBrand(null)
                setBrandId(brand.id)
                toast.success(tb("createSuccess"))
                setBrandDialogOpen(false)
              }}
              onCancel={() => setBrandDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <VariantGeneratorDialog
        open={generator.open}
        onOpenChange={(open) => setGenerator((g) => ({ ...g, open }))}
        initialMode={generator.mode}
        imported={importedVariants}
        brandName={brandName}
        productName={name}
        existing={variations}
        onAdd={(rows) => setVariations((prev) => [...prev, ...rows])}
      />

      {isSmartphone && canManageBrands && (
        <MobileApiImportDialog
          open={importDialog.open}
          onOpenChange={(open) => setImportDialog((d) => ({ ...d, open }))}
          productName={name}
          deviceId={importDialog.deviceId}
          brands={brands}
          onApply={handleImportApply}
        />
      )}
    </form>
  )
}
