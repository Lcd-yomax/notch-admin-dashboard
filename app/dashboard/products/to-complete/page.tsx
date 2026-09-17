"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconCircleCheck, IconCloudDownload, IconEdit, IconPhotoOff, IconPower, IconTag } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PageSpinner, Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { AccessDenied, Can } from "@/components/access"
import { MissingPhoto } from "@/components/products/missing-photo"
import { ProductForm, type ProductFormCategory } from "@/components/products/product-form"
import { usePermissions } from "@/hooks/use-permissions"

interface ToCompleteProduct {
  id: string
  name: string
  created_at: string
  mobileapi_device_id: string | null
  category_name: string | null
  brand_name: string | null
  image_url: string | null
  variations_count: number
  photos_missing: boolean
  missing_prices: string[]
  ready: boolean
}

type Filter = "all" | "photos" | "prices" | "ready"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

function matches(product: ToCompleteProduct, filter: Filter) {
  if (filter === "photos") return product.photos_missing
  if (filter === "prices") return product.missing_prices.length > 0
  if (filter === "ready") return product.ready
  return true
}

function ToCompleteContent() {
  const t = useTranslations("toComplete")
  const { hasPermission } = usePermissions()
  const canWrite = hasPermission("products:write")
  const { data: products = [], mutate, isLoading } = useSWR<ToCompleteProduct[]>("/api/products/to-complete", fetcher)
  const { data: categories = [] } = useSWR<ProductFormCategory[]>("/api/categories", fetcher)

  const [filter, setFilter] = React.useState<Filter>("all")
  const [search, setSearch] = React.useState("")
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [activatingId, setActivatingId] = React.useState<string | null>(null)
  const [photosId, setPhotosId] = React.useState<string | null>(null)
  const canImportPhotos = canWrite && hasPermission("brands.manage")

  const handleImportPhotos = async (product: ToCompleteProduct) => {
    setPhotosId(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/mobileapi-images`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) toast.error(data.error || t("photosFailed"))
      else toast.success(t("photosImported", { count: data.added }))
      mutate()
    } finally {
      setPhotosId(null)
    }
  }

  const counts = {
    all: products.length,
    photos: products.filter((p) => matches(p, "photos")).length,
    prices: products.filter((p) => matches(p, "prices")).length,
    ready: products.filter((p) => matches(p, "ready")).length,
  }
  const q = search.trim().toLowerCase()
  const visible = products.filter(
    (p) => matches(p, filter) && (!q || [p.name, p.brand_name, p.category_name].some((v) => v?.toLowerCase().includes(q)))
  )

  const handleActivate = async (product: ToCompleteProduct) => {
    setActivatingId(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/activate`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Server-side check: shows exactly what is missing
        toast.error(data.error || t("activateFailed"), {
          description: Array.isArray(data.blockers) ? data.blockers.join("\n") : undefined,
        })
      } else {
        toast.success(t("activated", { name: product.name }))
      }
      mutate()
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")}>
        {hasPermission("brands.manage") && canWrite && (
          <Button variant="outline" asChild>
            <Link href="/dashboard/products/import">
              <IconCloudDownload className="size-4" />
              <span className="hidden sm:inline">{t("bulkImport")}</span>
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="max-w-full overflow-x-auto">
          <TabsList>
            <TabsTrigger value="all">{t("filters.all", { count: counts.all })}</TabsTrigger>
            <TabsTrigger value="photos">{t("filters.photos", { count: counts.photos })}</TabsTrigger>
            <TabsTrigger value="prices">{t("filters.prices", { count: counts.prices })}</TabsTrigger>
            <TabsTrigger value="ready">{t("filters.ready", { count: counts.ready })}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="size-6" /></div>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {visible.map((product) => (
            <div key={product.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="size-12 shrink-0 rounded-md border object-cover" />
                ) : (
                  <MissingPhoto />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[product.brand_name, product.category_name, t("variations", { count: product.variations_count })]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.photos_missing && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        <IconPhotoOff className="size-3" />
                        {t("photosMissing")}
                      </Badge>
                    )}
                    {product.missing_prices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === product.id ? null : product.id)}
                        className="inline-flex"
                      >
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                          <IconTag className="size-3" />
                          {t("pricesMissing", { count: product.missing_prices.length })}
                        </Badge>
                      </button>
                    )}
                    {product.ready && (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">
                        <IconCircleCheck className="size-3" />
                        {t("ready")}
                      </Badge>
                    )}
                  </div>
                  {expanded === product.id && (
                    <ul className="space-y-0.5 pt-1 text-xs text-amber-700 dark:text-amber-400">
                      {product.missing_prices.map((label) => (
                        <li key={label}>{t("priceMissingLabel", { label })}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {canWrite && (
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  {canImportPhotos && product.photos_missing && product.mobileapi_device_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={photosId === product.id}
                      onClick={() => handleImportPhotos(product)}
                    >
                      {photosId === product.id ? <Spinner /> : <IconCloudDownload className="size-4" />}
                      {t("importPhotos")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setEditingId(product.id)}>
                    <IconEdit className="size-4" />
                    {t("complete")}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={!product.ready || activatingId === product.id}
                    title={product.ready ? undefined : t("notReady")}
                    onClick={() => handleActivate(product)}
                  >
                    {activatingId === product.id ? <Spinner /> : <IconPower className="size-4" />}
                    {t("activate")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null) }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("complete")}</DialogTitle>
            <DialogDescription>{t("completeDesc")}</DialogDescription>
          </DialogHeader>
          {editingId && (
            <ProductForm
              key={editingId}
              productId={editingId}
              categories={categories}
              onSaved={() => {
                mutate()
                setEditingId(null)
              }}
              onCancel={() => {
                // Photos or prices may have been saved even if activation failed
                mutate()
                setEditingId(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ToCompletePage() {
  return (
    <Can permission={["products:read", "products:write"]} fallback={<AccessDenied />}>
      <React.Suspense fallback={<PageSpinner />}>
        <ToCompleteContent />
      </React.Suspense>
    </Can>
  )
}
