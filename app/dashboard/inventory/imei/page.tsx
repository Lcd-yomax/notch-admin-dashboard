"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconDownload,
  IconFilterOff,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageSpinner, Spinner, TableSpinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { AccessDenied, Can } from "@/components/access"
import { cn } from "@/lib/utils"
import {
  ALLOWED_STATUS_TRANSITIONS,
  DEVICE_UNIT_STATUSES,
  type DeviceUnitStatus,
} from "@/lib/inventory/imei"

interface UnitRow {
  id: string
  imei: string
  imei2: string | null
  status: DeviceUnitStatus
  supplier: string | null
  purchase_price: number | null
  sale_price: number | null
  margin: number | null
  received_at: string | null
  sold_at: string | null
  product_name: string | null
  brand_name: string | null
  sku: string | null
  variation_label: string | null
  order_id: string | null
  order_number: string | null
}

interface UnitsResponse {
  rows: UnitRow[]
  total: number
  page: number
  page_size: number
}

interface Summary {
  in_stock: number
  stock_value: number
  sold_this_month: number
  margin_this_month: number
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

const FILTER_KEYS = ["imei", "product", "brand", "status", "supplier", "from", "to"] as const
const ALL = "all"

const statusClasses: Record<DeviceUnitStatus, string> = {
  in_stock: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  returned: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  defective: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
}

function money(value: number | null | undefined) {
  if (value == null) return "—"
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—"
}

function ImeiInventoryContent() {
  const t = useTranslations("imeiInventory")
  const tc = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""])) as Record<(typeof FILTER_KEYS)[number], string>
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const setParams = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete("page")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // IMEI search is typed: debounce before writing it to the URL
  const [imeiInput, setImeiInput] = React.useState(filters.imei)
  React.useEffect(() => {
    if (imeiInput === filters.imei) return
    const timer = setTimeout(() => setParams({ imei: imeiInput }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imeiInput])

  const listParams = new URLSearchParams()
  for (const key of FILTER_KEYS) if (filters[key]) listParams.set(key, filters[key])

  const pageParams = new URLSearchParams(listParams)
  pageParams.set("page", String(page))

  const { data, isLoading, mutate } = useSWR<UnitsResponse>(`/api/inventory/units?${pageParams}`, fetcher, {
    keepPreviousData: true,
  })
  const monthStart = React.useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }, [])
  const { data: summary, mutate: mutateSummary } = useSWR<Summary>(
    `/api/inventory/summary?month_start=${encodeURIComponent(monthStart)}`,
    fetcher
  )
  const { data: options } = useSWR<{ products: { id: string; name: string }[]; brands: { id: string; name: string }[] }>(
    "/api/inventory/filters",
    fetcher
  )
  const { data: suppliers = [] } = useSWR<string[]>("/api/inventory/suppliers", fetcher)

  // ── Status change ──────────────────────────────────────────────────────────
  const [action, setAction] = React.useState<{ unit: UnitRow; status: DeviceUnitStatus } | null>(null)
  const [note, setNote] = React.useState("")
  const [updating, setUpdating] = React.useState(false)

  const handleStatusChange = async () => {
    if (!action) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/inventory/units/${action.unit.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.status, note }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || t("statusError"))
        return
      }
      toast.success(t("statusSuccess"))
      setAction(null)
      setNote("")
      mutate()
      mutateSummary()
    } finally {
      setUpdating(false)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  const hasFilters = FILTER_KEYS.some((k) => filters[k])

  const cards = [
    { label: t("cards.inStock"), value: summary ? String(summary.in_stock) : "—" },
    { label: t("cards.stockValue"), value: summary ? money(summary.stock_value) : "—" },
    { label: t("cards.soldThisMonth"), value: summary ? String(summary.sold_this_month) : "—" },
    {
      label: t("cards.marginThisMonth"),
      value: summary ? money(summary.margin_this_month) : "—",
      className: summary && summary.margin_this_month < 0 ? "text-destructive" : "text-green-600",
    },
  ]

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" asChild>
          <a href={`/api/inventory/units?${listParams}${listParams.toString() ? "&" : ""}format=csv`} download>
            <IconDownload />
            <span className="hidden sm:inline">{t("exportCsv")}</span>
          </a>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className={cn("text-xl font-semibold tabular-nums sm:text-2xl", card.className)}>
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Input
          value={imeiInput}
          onChange={(e) => setImeiInput(e.target.value)}
          placeholder={t("filters.imei")}
          inputMode="numeric"
          className="font-mono"
        />
        <Select value={filters.product || ALL} onValueChange={(v) => setParams({ product: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder={t("filters.product")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allProducts")}</SelectItem>
            {options?.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.brand || ALL} onValueChange={(v) => setParams({ brand: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder={t("filters.brand")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allBrands")}</SelectItem>
            {options?.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status || ALL} onValueChange={(v) => setParams({ status: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder={tc("status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {DEVICE_UNIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.supplier || ALL} onValueChange={(v) => setParams({ supplier: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder={t("filters.supplier")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allSuppliers")}</SelectItem>
            {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label htmlFor="from" className="w-6 shrink-0 text-xs text-muted-foreground">{t("filters.from")}</Label>
          <Input id="from" type="date" value={filters.from} onChange={(e) => setParams({ from: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="to" className="w-6 shrink-0 text-xs text-muted-foreground">{t("filters.to")}</Label>
          <Input id="to" type="date" value={filters.to} onChange={(e) => setParams({ to: e.target.value })} />
        </div>
      </div>
      {hasFilters && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImeiInput("")
              router.replace(pathname, { scroll: false })
            }}
          >
            <IconFilterOff className="size-4" />
            {t("filters.clear")}
          </Button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>IMEI</TableHead>
              <TableHead>{t("columns.product")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead className="text-end">{t("columns.purchasePrice")}</TableHead>
              <TableHead className="text-end">{t("columns.salePrice")}</TableHead>
              <TableHead className="text-end">{t("columns.margin")}</TableHead>
              <TableHead>{t("columns.receivedAt")}</TableHead>
              <TableHead>{t("columns.soldAt")}</TableHead>
              <TableHead>{t("columns.order")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !data ? (
              <TableSpinner colSpan={11} />
            ) : data && data.rows.length > 0 ? (
              data.rows.map((unit) => {
                const transitions = ALLOWED_STATUS_TRANSITIONS[unit.status] || []
                return (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono text-xs">
                      <div>{unit.imei}</div>
                      {unit.imei2 && <div className="text-muted-foreground">{unit.imei2}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{unit.product_name}</div>
                      <div className="text-xs text-muted-foreground">{unit.variation_label}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClasses[unit.status]}>
                        {t(`statuses.${unit.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{unit.supplier || "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(unit.purchase_price)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(unit.sale_price)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-end font-medium tabular-nums",
                        unit.margin != null && (unit.margin < 0 ? "text-destructive" : "text-green-600")
                      )}
                    >
                      {money(unit.margin)}
                    </TableCell>
                    <TableCell>{date(unit.received_at)}</TableCell>
                    <TableCell>{date(unit.sold_at)}</TableCell>
                    <TableCell>
                      {unit.order_id && unit.order_number ? (
                        <Link href={`/dashboard/orders/${unit.order_id}`} className="text-primary hover:underline">
                          #{unit.order_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {transitions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                              <IconDotsVertical />
                              <span className="sr-only">{tc("actions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {transitions.map((status) => (
                              <DropdownMenuItem key={status} onClick={() => setAction({ unit, status })}>
                                {t(`actions.${unit.status}_${status}`)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("total", { count: data?.total ?? 0 })}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) }, false)}
          >
            <IconChevronLeft />
          </Button>
          <span className="text-sm">{t("pageOf", { current: page, total: totalPages })}</span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setParams({ page: String(page + 1) }, false)}
          >
            <IconChevronRight />
          </Button>
        </div>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => { if (!open) { setAction(null); setNote("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action ? t(`actions.${action.unit.status}_${action.status}`) : ""}</DialogTitle>
            <DialogDescription>
              {action &&
                t("confirmStatus", {
                  imei: action.unit.imei,
                  from: t(`statuses.${action.unit.status}`),
                  to: t(`statuses.${action.status}`),
                })}
            </DialogDescription>
          </DialogHeader>
          {action?.unit.order_number && (
            <p className="text-sm text-muted-foreground">{t("linkedOrder", { order: action.unit.order_number })}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="status-note">{t("note")}</Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{tc("cancel")}</Button>
            <Button
              onClick={handleStatusChange}
              disabled={updating}
              variant={action?.status === "defective" ? "destructive" : "default"}
            >
              {updating && <Spinner className="mr-1" />}
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ImeiInventoryPage() {
  return (
    <Can permission="inventory.imei" fallback={<AccessDenied />}>
      <React.Suspense fallback={<PageSpinner />}>
        <ImeiInventoryContent />
      </React.Suspense>
    </Can>
  )
}
