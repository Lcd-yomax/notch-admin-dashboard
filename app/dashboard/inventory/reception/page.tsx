"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconBarcode, IconCircleCheck, IconSearch, IconTrash } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageSpinner, Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { AccessDenied, Can } from "@/components/access"
import { cn } from "@/lib/utils"
import { imeiFormatError, imeiFormatErrorCode, splitImeiInput } from "@/lib/inventory/imei"
import { formatVariationLabel } from "@/lib/products/smartphone"

interface InventoryVariation {
  id: string
  sku: string
  storage_gb: number | null
  ram_gb: number | null
  color: string | null
  condition: string | null
  stock: number
  is_active: boolean
}

interface InventoryProduct {
  id: string
  name: string
  thumbnail_url: string | null
  brand_name: string | null
  variations: InventoryVariation[]
}

interface PendingRow {
  key: string
  imei: string
  imei2: string
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

const BEEP_STORAGE_KEY = "reception-beep"

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
    osc.onended = () => ctx.close()
  } catch {
    // Audio not available: the visual flash is enough
  }
}

function ReceptionContent() {
  const t = useTranslations("reception")
  const tc = useTranslations("common")
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("variation")

  // ── Step 1: variation ──────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: products = [], isLoading: loadingProducts } = useSWR<InventoryProduct[]>(
    `/api/inventory/variations?q=${encodeURIComponent(debouncedSearch)}`,
    fetcher
  )
  const { data: preselected } = useSWR<InventoryProduct[]>(
    preselectedId ? `/api/inventory/variations?variation=${preselectedId}` : null,
    fetcher
  )
  const { data: suppliers = [] } = useSWR<string[]>("/api/inventory/suppliers", fetcher)

  const [selected, setSelected] = React.useState<{ product: InventoryProduct; variation: InventoryVariation } | null>(null)

  React.useEffect(() => {
    if (!preselected || selected) return
    const product = preselected[0]
    const variation = product?.variations.find((v) => v.id === preselectedId)
    if (product && variation) setSelected({ product, variation })
  }, [preselected, preselectedId, selected])

  // ── Step 2: batch ──────────────────────────────────────────────────────────
  const [supplier, setSupplier] = React.useState("")
  const [purchasePrice, setPurchasePrice] = React.useState("")

  // ── Step 3: IMEIs ──────────────────────────────────────────────────────────
  const [rows, setRows] = React.useState<PendingRow[]>([])
  const [scan, setScan] = React.useState("")
  const [flash, setFlash] = React.useState(false)
  const [beepEnabled, setBeepEnabled] = React.useState(false)
  const [dbStatus, setDbStatus] = React.useState<Record<string, boolean>>({})
  const [checking, setChecking] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<{ inserted: number; stock: number | null } | null>(null)
  const scanRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    try {
      setBeepEnabled(localStorage.getItem(BEEP_STORAGE_KEY) === "1")
    } catch {
      // Storage unavailable: keep the default
    }
  }, [])

  React.useEffect(() => {
    if (selected) scanRef.current?.focus()
  }, [selected])

  // Check new values against the database in one batch query
  React.useEffect(() => {
    const unchecked = rows
      .flatMap((r) => [r.imei, r.imei2])
      .filter((v) => v && !imeiFormatError(v) && dbStatus[v] === undefined)
    if (unchecked.length === 0) return
    const timer = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await fetch("/api/inventory/imei-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imeis: unchecked }),
        })
        if (!res.ok) throw new Error()
        const { existing } = (await res.json()) as { existing: string[] }
        setDbStatus((prev) => ({
          ...prev,
          ...Object.fromEntries(unchecked.map((v) => [v, existing.includes(v)])),
        }))
      } catch {
        toast.error(t("checkFailed"))
      } finally {
        setChecking(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [rows, dbStatus, t])

  const errorFor = React.useCallback(
    (value: string, rowKey: string, field: "imei" | "imei2"): string | null => {
      if (!value) return field === "imei" ? t("errors.required") : null
      const formatError = imeiFormatErrorCode(value)
      if (formatError) return t(`errors.${formatError}`)
      // Duplicate: the same value earlier in the list (or as imei of the same row)
      for (const r of rows) {
        if (r.key === rowKey) {
          if (field === "imei2" && r.imei === value) return t("errors.duplicate")
          break
        }
        if (r.imei === value || r.imei2 === value) return t("errors.duplicate")
      }
      if (dbStatus[value]) return t("errors.exists")
      return null
    },
    [rows, dbStatus, t]
  )

  const rowState = rows.map((row) => {
    const error = errorFor(row.imei, row.key, "imei") || errorFor(row.imei2, row.key, "imei2")
    const pending = [row.imei, row.imei2].some((v) => v && !imeiFormatError(v) && dbStatus[v] === undefined)
    return { row, error, pending }
  })
  const validCount = rowState.filter((s) => !s.error && !s.pending).length
  const invalidCount = rowState.filter((s) => s.error).length
  const pendingCount = rowState.filter((s) => s.pending && !s.error).length
  const priceValid = purchasePrice !== "" && Number(purchasePrice) >= 0

  const addImeis = (values: string[]) => {
    if (values.length === 0) return
    setLastResult(null)
    const known = new Set(rows.flatMap((r) => [r.imei, r.imei2]).filter(Boolean))
    const cleaned = values.map((v) => v.replace(/\s/g, ""))
    const anyValid = cleaned.some((v) => !imeiFormatError(v) && !known.has(v))
    setRows((prev) => [...prev, ...cleaned.map((imei) => ({ key: crypto.randomUUID(), imei, imei2: "" }))])
    if (anyValid) {
      setFlash(true)
      setTimeout(() => setFlash(false), 250)
      if (beepEnabled) beep()
    }
  }

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    addImeis(splitImeiInput(scan))
    setScan("")
    scanRef.current?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    const values = splitImeiInput(text)
    if (values.length > 1) {
      e.preventDefault()
      addImeis(values)
      setScan("")
    }
  }

  const handleSave = async () => {
    if (!selected || invalidCount > 0 || pendingCount > 0 || validCount === 0 || !priceValid) return
    setSaving(true)
    try {
      const res = await fetch("/api/inventory/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation_id: selected.variation.id,
          supplier,
          purchase_price: purchasePrice,
          units: rows.map((r) => ({ imei: r.imei, imei2: r.imei2 || null })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.invalid) {
          // Values reported by the server as already used turn red in the list
          setDbStatus((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.keys(data.invalid).map((v) => [v, true])),
          }))
        }
        toast.error(data.error || t("saveFailed"))
        return
      }
      setLastResult({ inserted: data.inserted, stock: data.stock })
      toast.success(t("saved", { count: data.inserted, stock: data.stock ?? "?" }))
      setRows([])
      setSelected((s) => (s ? { ...s, variation: { ...s.variation, stock: data.stock ?? s.variation.stock } } : s))
    } catch {
      toast.error(t("saveFailed"))
    } finally {
      setSaving(false)
      scanRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")} />

      {/* ── Step 1 ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("step1")}</CardTitle>
          {!selected && <CardDescription>{t("step1Desc")}</CardDescription>}
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="flex flex-wrap items-center gap-3">
              {selected.product.thumbnail_url && (
                <img src={selected.product.thumbnail_url} alt="" className="size-12 rounded-md object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{selected.product.name}</p>
                <p className="text-sm text-muted-foreground">{formatVariationLabel(selected.variation)}</p>
                <p className="font-mono text-xs text-muted-foreground">{selected.variation.sku}</p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {t("currentStock", { stock: selected.variation.stock })}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)} disabled={rows.length > 0}>
                {t("change")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchProduct")}
                  className="pl-9"
                />
              </div>
              {loadingProducts ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : products.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t("noProducts")}</p>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
                        <span className="font-medium">{product.name}</span>
                        {product.brand_name && <span className="text-xs text-muted-foreground">{product.brand_name}</span>}
                      </div>
                      {product.variations.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">{t("noVariations")}</p>
                      ) : (
                        <div className="divide-y">
                          {product.variations.map((variation) => (
                            <button
                              key={variation.id}
                              type="button"
                              onClick={() => setSelected({ product, variation })}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                            >
                              <span className={cn(!variation.is_active && "text-muted-foreground")}>
                                {formatVariationLabel(variation) || variation.sku}
                              </span>
                              <Badge variant={variation.stock > 0 ? "secondary" : "outline"}>
                                {t("stockShort", { stock: variation.stock })}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <>
          {/* ── Step 2 ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("step2")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">{t("supplier")}</Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  list="supplier-suggestions"
                  placeholder={t("supplierPlaceholder")}
                  autoComplete="off"
                />
                <datalist id="supplier-suggestions">
                  {suppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-price">{t("purchasePrice")} *</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="DH"
                  aria-invalid={rows.length > 0 && !priceValid}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Step 3 ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <div className="space-y-1.5">
                <CardTitle className="text-base">{t("step3")}</CardTitle>
                <CardDescription>{t("step3Desc")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="beep"
                  checked={beepEnabled}
                  onCheckedChange={(checked) => {
                    setBeepEnabled(checked)
                    try {
                      localStorage.setItem(BEEP_STORAGE_KEY, checked ? "1" : "0")
                    } catch {
                      // Storage unavailable: setting only lasts for this visit
                    }
                  }}
                />
                <Label htmlFor="beep" className="font-normal">{t("beep")}</Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <IconBarcode className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={scanRef}
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  onPaste={handlePaste}
                  placeholder={t("scanPlaceholder")}
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  className={cn(
                    "h-12 pl-11 font-mono text-lg transition-shadow",
                    flash && "border-green-500 ring-4 ring-green-500/40"
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t("readyCount", { count: validCount })}
                  {invalidCount > 0 && (
                    <span className="ms-2 text-destructive">{t("invalidCount", { count: invalidCount })}</span>
                  )}
                  {(checking || pendingCount > 0) && (
                    <span className="ms-2 inline-flex items-center gap-1 text-muted-foreground">
                      <Spinner className="size-3" />
                      {t("checking")}
                    </span>
                  )}
                </p>
                {rows.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setRows([])}>
                    {t("clearList")}
                  </Button>
                )}
              </div>

              {lastResult && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                  <IconCircleCheck className="size-4 shrink-0" />
                  {t("saved", { count: lastResult.inserted, stock: lastResult.stock ?? "?" })}
                </div>
              )}

              {rows.length > 0 && (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="min-w-[170px]">IMEI</TableHead>
                        <TableHead className="min-w-[190px]">{t("imei2")}</TableHead>
                        <TableHead className="min-w-[160px]">{tc("status")}</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowState.map(({ row, error, pending }, index) => (
                        <TableRow key={row.key} className={cn(error && "bg-destructive/5")}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className={cn("font-mono", error && "text-destructive")}>{row.imei}</TableCell>
                          <TableCell>
                            <Input
                              value={row.imei2}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) => (r.key === row.key ? { ...r, imei2: e.target.value.replace(/\s/g, "") } : r))
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  scanRef.current?.focus()
                                }
                              }}
                              placeholder={t("optional")}
                              inputMode="numeric"
                              className="h-8 font-mono"
                            />
                          </TableCell>
                          <TableCell>
                            {error ? (
                              <span className="text-sm text-destructive">{error}</span>
                            ) : pending ? (
                              <span className="text-sm text-muted-foreground">{t("checking")}</span>
                            ) : (
                              <Badge className="bg-green-600 text-white hover:bg-green-600">{t("ready")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                              aria-label={tc("delete")}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                {invalidCount > 0 && <p className="text-sm text-destructive">{t("fixInvalid")}</p>}
                {rows.length > 0 && !priceValid && <p className="text-sm text-destructive">{t("priceRequired")}</p>}
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={saving || invalidCount > 0 || pendingCount > 0 || validCount === 0 || !priceValid}
                >
                  {saving && <Spinner className="mr-1" />}
                  {tc("save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function StockReceptionPage() {
  return (
    <Can permission="inventory.imei" fallback={<AccessDenied />}>
      <React.Suspense fallback={<PageSpinner />}>
        <ReceptionContent />
      </React.Suspense>
    </Can>
  )
}
