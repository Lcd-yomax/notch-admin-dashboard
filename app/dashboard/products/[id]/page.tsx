"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { usePermissions } from "@/hooks/use-permissions"
import { TableSpinner } from "@/components/ui/spinner"
import { useTranslations } from "next-intl"
import { formatVariationLabel, isSmartphoneCategory } from "@/lib/products/smartphone"

interface ProductVariation {
  id: string
  product_id: string
  sku: string
  color: string | null
  size: string | null
  price: number
  price_display: number | null
  discount_label: string | null
  stock: number
  is_active: boolean
  storage_gb?: number | null
  ram_gb?: number | null
  condition?: string | null
  product_images?: VariationImage[]
}

interface VariationImage {
  id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
  thumbnail_url: string | null
  is_active: boolean
  is_featured: boolean
  is_best_seller: boolean
  created_at: string
  categories?: { name: string; slug: string } | null
  product_variations?: ProductVariation[]
  product_images?: VariationImage[]
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

function VariationForm({
  variation,
  productId,
  onSave,
  onCancel,
}: {
  variation?: ProductVariation | null
  productId: string
  onSave: () => void
  onCancel: () => void
}) {
  const t = useTranslations("productDetail")
  const tc = useTranslations("common")
  const [sku, setSku] = React.useState(variation?.sku || "")
  const [color, setColor] = React.useState(variation?.color || "")
  const [size, setSize] = React.useState(variation?.size || "")
  const [price, setPrice] = React.useState(variation?.price?.toString() || "")
  const [priceDisplay, setPriceDisplay] = React.useState(variation?.price_display?.toString() || "")
  const [discountLabel, setDiscountLabel] = React.useState(variation?.discount_label || "")
  const [stock, setStock] = React.useState(variation?.stock?.toString() || "0")
  const [isActive, setIsActive] = React.useState(variation?.is_active ?? true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Image management
  const [existingImages, setExistingImages] = React.useState<VariationImage[]>(variation?.product_images || [])
  const [newFiles, setNewFiles] = React.useState<File[]>([])
  const [newPreviews, setNewPreviews] = React.useState<string[]>([])
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setNewFiles((prev) => [...prev, ...files])
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ""
  }

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id))
  }

  React.useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const variationData = {
        sku,
        color: color || null,
        size: size || null,
        price: parseFloat(price),
        price_display: priceDisplay ? parseFloat(priceDisplay) : null,
        discount_label: discountLabel || null,
        stock: parseInt(stock) || 0,
        is_active: isActive,
      }

      let variationId = variation?.id

      if (variation) {
        // Update existing
        const res = await fetch(`/api/products/${productId}/variations/${variation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variationData),
        })
        if (!res.ok) throw new Error("Failed to update variation")
      } else {
        // Create new
        const res = await fetch(`/api/products/${productId}/variations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variationData),
        })
        if (!res.ok) throw new Error("Failed to create variation")
        const created = await res.json()
        variationId = created.id
      }

      // Upload new images
      if (variationId && newFiles.length > 0) {
        const uploadedUrls: string[] = []
        for (const file of newFiles) {
          const formData = new FormData()
          formData.append("file", file)
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          const data = await res.json().catch(() => ({}))
          if (!res.ok || !data.url) throw new Error(data.error || "Image upload failed")
          uploadedUrls.push(data.url)
        }
        // Sync images for this variation
        const imageResponse = await fetch(`/api/products/${productId}/images`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keepIds: existingImages.map((img) => img.id),
            newUrls: uploadedUrls,
            variationId,
          }),
        })
        const imageResult = await imageResponse.json().catch(() => ({}))
        if (!imageResponse.ok) throw new Error(imageResult.error || "Image save failed")
      } else if (variationId && existingImages.length !== (variation?.product_images?.length ?? 0)) {
        // Images were removed, sync
        const imageResponse = await fetch(`/api/products/${productId}/images`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keepIds: existingImages.map((img) => img.id),
            newUrls: [],
            variationId,
          }),
        })
        const imageResult = await imageResponse.json().catch(() => ({}))
        if (!imageResponse.ok) throw new Error(imageResult.error || "Image save failed")
      }

      onSave()
    } catch (error) {
      toast.error((error as Error).message || "Impossible d'enregistrer la variante")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">{t("sku")} *</Label>
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder={t("skuPlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">{t("color")}</Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={t("colorPlaceholder")}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="size">{t("size")}</Label>
          <Input
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder={t("sizePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">{t("stock")} *</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">{t("price")} *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("pricePlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_display">{t("originalPrice")}</Label>
          <Input
            id="price_display"
            type="number"
            step="0.01"
            min="0"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
            placeholder={t("originalPricePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount_label">{t("discountLabel")}</Label>
          <Input
            id="discount_label"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            placeholder={t("discountLabelPlaceholder")}
          />
        </div>
      </div>

      {/* Variation Images */}
      <div className="space-y-2">
        <Label>{t("variationImagesLabel")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("variationImagesDesc")}
        </p>
        <div className="flex flex-wrap gap-3">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative size-20 rounded-lg border overflow-hidden">
              <img src={img.url} alt={img.alt_text || ""} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(img.id)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash className="size-4 text-white" />
              </button>
            </div>
          ))}
          {newPreviews.map((src, i) => (
            <div key={`new-${i}`} className="group relative size-20 rounded-lg border overflow-hidden">
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewFile(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash className="size-4 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <IconUpload className="size-5" />
            <span className="text-[10px]">Add</span>
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAddFiles}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="var_is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="var_is_active">{tc("active")}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("saving") : variation ? t("updateVariation") : t("addVariation")}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const t = useTranslations("productDetail")
  const tc = useTranslations("common")
  const { data: product, mutate, isLoading } = useSWR<Product>(`/api/products/${id}`, fetcher)

  const [variationDialogOpen, setVariationDialogOpen] = React.useState(false)
  const [editingVariation, setEditingVariation] = React.useState<ProductVariation | null>(null)
  const [deletingVariation, setDeletingVariation] = React.useState<ProductVariation | null>(null)

  const handleVariationSaved = () => {
    mutate()
    toast.success(t("variationSaveSuccess"))
    setVariationDialogOpen(false)
    setEditingVariation(null)
  }

  const handleDeleteVariation = async () => {
    if (!deletingVariation) return
    await fetch(`/api/products/${id}/variations/${deletingVariation.id}`, {
      method: "DELETE",
    })
    mutate()
    toast.success(t("variationDeleteSuccess"))
    setDeletingVariation(null)
  }

  const variations = product?.product_variations || []
  const isSmartphone = isSmartphoneCategory(product?.categories?.slug)
  const productImages = (product?.product_images || []).filter((img) => !img.sort_order || true)

  // Group variations by color for summary
  const colors = [...new Set(variations.map((v) => v.color).filter(Boolean))]
  const sizes = [...new Set(variations.map((v) => v.size).filter(Boolean))]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">{t("loadingProduct")}</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-muted-foreground">{t("productNotFound")}</div>
        <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
          <IconArrowLeft className="mr-2 size-4" />
          {t("backToProducts")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader
        title={product.name}
        description={`${product.categories?.name || t("category")} • ${t("variationCount", { count: variations.length })}`}
      >
        <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
          <IconArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </PageHeader>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="variations">{t("variations")} ({variations.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("productDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">{t("name")}</span>
                  <span>{product.name}</span>
                  <span className="text-muted-foreground">{t("slug")}</span>
                  <span className="font-mono text-xs">{product.slug}</span>
                  <span className="text-muted-foreground">{t("category")}</span>
                  <span>{product.categories?.name || "—"}</span>
                  <span className="text-muted-foreground">{t("status")}</span>
                  <span>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? tc("active") : tc("inactive")}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">{t("featured")}</span>
                  <span>{product.is_featured ? t("yes") : t("no")}</span>
                  <span className="text-muted-foreground">{t("bestSeller")}</span>
                  <span>{product.is_best_seller ? t("yes") : t("no")}</span>
                  <span className="text-muted-foreground">{tc("created")}</span>
                  <span>{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
                {product.description && (
                  <div className="pt-2 border-t">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("variationSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">{t("total")}</span>
                  <span>{t("variationCount", { count: variations.length })}</span>
                  {colors.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t("colors")}</span>
                      <div className="flex flex-wrap gap-1">
                        {colors.map((c) => (
                          <Badge key={c} variant="outline">{c}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                  {sizes.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t("sizes")}</span>
                      <div className="flex flex-wrap gap-1">
                        {sizes.map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                  <span className="text-muted-foreground">{t("totalStock")}</span>
                  <span>{t("units", { count: variations.reduce((sum, v) => sum + v.stock, 0) })}</span>
                  {variations.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t("priceRange")}</span>
                      <span>
                        {Math.min(...variations.map((v) => v.price)).toFixed(2)} DH
                        {Math.min(...variations.map((v) => v.price)) !== Math.max(...variations.map((v) => v.price)) &&
                          ` – ${Math.max(...variations.map((v) => v.price)).toFixed(2)} DH`}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Images */}
          {productImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("productImages")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {productImages.map((img) => (
                    <div key={img.id} className="relative size-24 rounded-lg border overflow-hidden">
                      <img src={img.url} alt={img.alt_text || ""} className="size-full object-cover" />
                      {img.is_primary && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                          {t("primary")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Variations Tab */}
        <TabsContent value="variations" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("manageVariations")}
            </p>
            {hasPermission("products:write") && (
              <Button onClick={() => { setEditingVariation(null); setVariationDialogOpen(true) }}>
                <IconPlus className="mr-2 size-4" />
                {t("addVariation")}
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>{t("sku")}</TableHead>
                  <TableHead>{t("color")}</TableHead>
                  <TableHead>{t("size")}</TableHead>
                  <TableHead>{t("price")}</TableHead>
                  <TableHead>{t("originalPrice")}</TableHead>
                  <TableHead>{t("discount")}</TableHead>
                  <TableHead>{t("stock")}</TableHead>
                  <TableHead>{t("images")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="w-[80px]">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.length > 0 ? (
                  variations.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{v.sku}</div>
                        {isSmartphone && (
                          <div className="text-xs text-muted-foreground">{formatVariationLabel(v)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.color ? (
                          <Badge variant="outline">{v.color}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.size ? (
                          <Badge variant="outline">{v.size}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{v.price.toFixed(2)} DH</TableCell>
                      <TableCell>
                        {v.price_display ? (
                          <span className="line-through text-muted-foreground">
                            {v.price_display.toFixed(2)} DH
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.discount_label ? (
                          <Badge variant="secondary">{v.discount_label}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.stock > 0 ? "default" : "destructive"}>
                          {v.stock > 0 ? t("inStock", { count: v.stock }) : t("outOfStock")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(v.product_images?.length ?? 0) > 0 ? (
                          <div className="flex -space-x-2">
                            {v.product_images!.slice(0, 3).map((img) => (
                              <img
                                key={img.id}
                                src={img.url}
                                alt=""
                                className="size-8 rounded-md border-2 border-background object-cover"
                              />
                            ))}
                            {v.product_images!.length > 3 && (
                              <div className="flex size-8 items-center justify-center rounded-md border-2 border-background bg-muted text-xs">
                                +{v.product_images!.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">{t("none")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.is_active ? "default" : "secondary"}>
                          {v.is_active ? tc("active") : tc("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {hasPermission("products:write") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => { setEditingVariation(v); setVariationDialogOpen(true) }}
                            >
                              <IconEdit className="size-4" />
                            </Button>
                          )}
                          {hasPermission("products:delete") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingVariation(v)}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <div className="text-muted-foreground">{t("noVariationsYet")}</div>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {t("addVariationsHint")}
                        </p>
                        {hasPermission("products:write") && (
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => { setEditingVariation(null); setVariationDialogOpen(true) }}
                          >
                            <IconPlus className="size-4 mr-1" />
                            {t("addFirstVariation")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Variation Dialog */}
      <Dialog
        open={variationDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setVariationDialogOpen(false); setEditingVariation(null) }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariation ? t("editVariation") : t("addVariation")}</DialogTitle>
            <DialogDescription>
              {editingVariation
                ? t("editVariationDesc")
                : t("addVariationDesc")}
            </DialogDescription>
          </DialogHeader>
          <VariationForm
            variation={editingVariation}
            productId={id}
            onSave={handleVariationSaved}
            onCancel={() => { setVariationDialogOpen(false); setEditingVariation(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Variation Dialog */}
      <Dialog open={!!deletingVariation} onOpenChange={() => setDeletingVariation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteVariation")}</DialogTitle>
            <DialogDescription>
              {t("deleteVariationConfirm", { sku: deletingVariation?.sku ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingVariation(null)}>{tc("cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteVariation}>{tc("delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
