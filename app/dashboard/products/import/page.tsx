"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCircleCheck,
  IconCloudDownload,
  IconDeviceMobile,
  IconSearch,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { AccessDenied } from "@/components/access"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"
import { formatStorage } from "@/lib/products/smartphone"
import type { MobileApiSearchResult } from "@/lib/mobileapi/types"

type BulkResult = MobileApiSearchResult & { already_imported: { id: string; name: string } | null }

interface Row {
  key: string
  query: string
  search: "pending" | "searching" | "done" | "error"
  source?: "cache" | "name_cache" | "api"
  error?: string | null
  results: BulkResult[]
  selectedId: string | null
  prices: Record<string, string>
  import?: "importing" | "created" | "exists" | "error"
  importMessage?: string
  product?: { id: string; name: string }
  warnings?: string[]
}

const SKIP = "__skip__"
const MIN_QUERY = 3
// Errors that make the following calls fail too: stop the loop
const BLOCKING_ERRORS = ["Crédits MobileAPI épuisés", "Clé MobileAPI invalide"]

function parseQueries(text: string) {
  const seen = new Set<string>()
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => {
      const key = line.toLowerCase()
      if (line.length < MIN_QUERY || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function useCreditEstimate(body: { queries?: string[]; device_ids?: string[] } | null) {
  const [estimate, setEstimate] = React.useState<{ search_credits: number; details_credits: number } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const json = body ? JSON.stringify(body) : null

  React.useEffect(() => {
    if (!json) {
      setEstimate(null)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/mobileapi/bulk/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: json,
          signal: controller.signal,
        })
        if (res.ok) setEstimate(await res.json())
      } catch {
        // Aborted or offline: keep the previous estimate
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 500)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [json])

  return { estimate, loading }
}

function BulkImportContent() {
  const t = useTranslations("bulkImport")
  const [text, setText] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>([])
  const [phase, setPhase] = React.useState<"input" | "select" | "importing" | "done">("input")

  const queries = React.useMemo(() => parseQueries(text), [text])
  const searchEstimate = useCreditEstimate(phase === "input" && queries.length > 0 ? { queries } : null)

  const selectedRows = rows.filter((r) => r.selectedId && r.import !== "created" && r.import !== "exists")
  const importEstimate = useCreditEstimate(
    phase === "select" && selectedRows.length > 0 ? { device_ids: selectedRows.map((r) => r.selectedId!) } : null
  )

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const searchRow = async (row: Row, force = false): Promise<string | null> => {
    updateRow(row.key, { search: "searching", error: null })
    try {
      const res = await fetch(
        `/api/mobileapi/bulk/search?q=${encodeURIComponent(row.query)}${force ? "&force=1" : ""}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        updateRow(row.key, { search: "error", error: data.error || t("searchFailed"), results: [], selectedId: null })
        return data.error || null
      }
      const results: BulkResult[] = data.results || []
      updateRow(row.key, {
        search: "done",
        source: data.source,
        error: data.error,
        results,
        // Best match that is not imported yet
        selectedId: results.find((r) => !r.already_imported)?.id ?? null,
        prices: {},
      })
      return null
    } catch {
      updateRow(row.key, { search: "error", error: t("searchFailed"), results: [], selectedId: null })
      return null
    }
  }

  const handleSearch = async () => {
    const newRows: Row[] = queries.map((query) => ({
      key: crypto.randomUUID(),
      query,
      search: "pending",
      results: [],
      selectedId: null,
      prices: {},
    }))
    setRows(newRows)
    setPhase("select")
    // One by one: shows progress and stops as soon as credits run out
    for (const [i, row] of newRows.entries()) {
      const error = await searchRow(row)
      if (error && BLOCKING_ERRORS.includes(error)) {
        for (const rest of newRows.slice(i + 1)) updateRow(rest.key, { search: "error", error })
        toast.error(error)
        break
      }
    }
  }

  const handleImport = async () => {
    const toImport = selectedRows
    setPhase("importing")
    for (const [i, row] of toImport.entries()) {
      updateRow(row.key, { import: "importing", importMessage: undefined })
      try {
        const res = await fetch("/api/mobileapi/bulk/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: row.selectedId, prices: row.prices }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          updateRow(row.key, { import: "error", importMessage: data.error || t("importFailed") })
          if (BLOCKING_ERRORS.includes(data.error)) {
            for (const rest of toImport.slice(i + 1)) updateRow(rest.key, { import: "error", importMessage: data.error })
            toast.error(data.error)
            break
          }
          continue
        }
        updateRow(row.key, {
          import: data.status === "exists" ? "exists" : "created",
          product: data.product,
          warnings: data.warnings || [],
          importMessage:
            data.status === "exists"
              ? t("alreadyImported")
              : t("createdSummary", { variations: data.variations, specs: data.specs, missing: data.missing_prices }),
        })
      } catch {
        updateRow(row.key, { import: "error", importMessage: t("importFailed") })
      }
    }
    setPhase("done")
  }

  const createdCount = rows.filter((r) => r.import === "created").length
  const searching = rows.some((r) => r.search === "searching" || r.search === "pending")

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/products/to-complete">{t("toCompleteLink")}</Link>
        </Button>
      </PageHeader>

      {phase === "input" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("step1")}</CardTitle>
            <CardDescription>{t("step1Desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Galaxy A55\nGalaxy S24 Ultra\nRedmi Note 13 Pro\niPhone 15"}
              className="min-h-[180px] font-mono"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CreditLine
                loading={searchEstimate.loading}
                credits={searchEstimate.estimate?.search_credits}
                label={(count) => t("searchCost", { count })}
              />
              <Button onClick={handleSearch} disabled={queries.length === 0}>
                <IconSearch className="size-4" />
                {t("searchButton", { count: queries.length })}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {phase !== "importing" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRows([])
                  setPhase("input")
                }}
              >
                <IconArrowLeft className="size-4" />
                {t("newSearch")}
              </Button>
            )}
            {searching && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                {t("searching")}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {rows.map((row) => (
              <RowCard
                key={row.key}
                row={row}
                locked={phase === "importing" || phase === "done"}
                onChange={(patch) => updateRow(row.key, patch)}
                onForceSearch={() => searchRow(row, true)}
              />
            ))}
          </div>

          {/* ── Import bar ───────────────────────────────────────────────── */}
          {phase === "select" && (
            <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("selectedCount", { count: selectedRows.length })}</p>
                  <CreditLine
                    loading={importEstimate.loading}
                    credits={selectedRows.length > 0 ? importEstimate.estimate?.details_credits : 0}
                    label={(count) => t("importCost", { count })}
                  />
                </div>
                <Button size="lg" onClick={handleImport} disabled={selectedRows.length === 0 || searching}>
                  <IconCloudDownload className="size-4" />
                  {t("importButton", { count: selectedRows.length })}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("importHint")}</p>
            </div>
          )}

          {phase === "importing" && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {t("importing")}
            </p>
          )}

          {phase === "done" && (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 font-medium">
                  <IconCircleCheck className="size-5 text-green-600" />
                  {t("doneSummary", { count: createdCount })}
                </p>
                <Button asChild>
                  <Link href="/dashboard/products/to-complete">{t("toCompleteLink")}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function CreditLine({
  loading,
  credits,
  label,
}: {
  loading: boolean
  credits: number | undefined
  label: (count: number) => string
}) {
  if (loading || credits === undefined) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3" />
      </span>
    )
  }
  return (
    <span className={cn("text-sm", credits > 0 ? "text-amber-600" : "text-green-600")}>{label(credits)}</span>
  )
}

function RowCard({
  row,
  locked,
  onChange,
  onForceSearch,
}: {
  row: Row
  locked: boolean
  onChange: (patch: Partial<Row>) => void
  onForceSearch: () => void
}) {
  const t = useTranslations("bulkImport")
  const selected = row.results.find((r) => r.id === row.selectedId)

  return (
    <Card className={cn(row.import === "error" && "border-destructive/50")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">« {row.query} »</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {row.source === "api" && <Badge variant="outline">{t("sourceApi")}</Badge>}
            {row.source === "cache" && <Badge variant="secondary">{t("sourceCache")}</Badge>}
            {row.source === "name_cache" && <Badge variant="secondary">{t("sourceNameCache")}</Badge>}
            {row.import === "created" && <Badge className="bg-green-600 text-white hover:bg-green-600">{t("created")}</Badge>}
            {row.import === "exists" && <Badge variant="outline">{t("alreadyImported")}</Badge>}
            {row.import === "importing" && <Spinner />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(row.search === "pending" || row.search === "searching") && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            {row.search === "pending" ? t("waiting") : t("searching")}
          </p>
        )}
        {row.error && <p className="text-sm text-destructive">{row.error}</p>}

        {row.source === "name_cache" && !locked && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {t("nameCacheHint")}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onForceSearch}>
              {t("searchAnyway")}
            </Button>
          </div>
        )}

        {row.results.length > 0 && (
          <RadioGroup
            value={row.selectedId ?? SKIP}
            onValueChange={(value) => onChange({ selectedId: value === SKIP ? null : value, prices: {} })}
            disabled={locked}
            className="gap-2"
          >
            {row.results.map((result) => {
              const id = `${row.key}-${result.id}`
              const imported = result.already_imported
              return (
                <Label
                  key={result.id}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-2 font-normal",
                    row.selectedId === result.id && "border-primary bg-primary/5",
                    imported && "cursor-not-allowed opacity-60"
                  )}
                >
                  <RadioGroupItem value={result.id} id={id} disabled={!!imported} />
                  {/* API thumbnail: preview only, never saved as a product image */}
                  {result.image_b64 ? (
                    <img
                      src={`data:image/jpeg;base64,${result.image_b64}`}
                      alt=""
                      className="size-12 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                      <IconDeviceMobile className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{result.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[result.manufacturer_name, result.release_year, result.storages.map(formatStorage).join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {imported ? (
                    <Badge variant="outline">{t("alreadyImported")}</Badge>
                  ) : (
                    result.match_certainty && <Badge variant="secondary">{result.match_certainty}</Badge>
                  )}
                </Label>
              )
            })}
            <Label
              htmlFor={`${row.key}-skip`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-2 font-normal text-muted-foreground"
            >
              <RadioGroupItem value={SKIP} id={`${row.key}-skip`} />
              {t("skip")}
            </Label>
          </RadioGroup>
        )}

        {selected && (
          <div className="space-y-3 rounded-lg bg-muted/40 p-3">
            <div>
              <p className="text-sm font-medium">{t("prices")}</p>
              <p className="text-xs text-muted-foreground">{t("pricesHint")}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(selected.storages.length > 0 ? selected.storages.map(String) : ["default"]).map((storage) => (
                <div key={storage} className="flex items-center gap-2">
                  <Label className="w-16 shrink-0 text-sm font-normal text-muted-foreground">
                    {storage === "default" ? t("allStorages") : formatStorage(Number(storage))}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={row.prices[storage] ?? ""}
                    onChange={(e) => onChange({ prices: { ...row.prices, [storage]: e.target.value } })}
                    placeholder="DH"
                    disabled={locked}
                  />
                </div>
              ))}
            </div>
            {selected.colors.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground">{t("colors")}</span>
                {selected.colors.map((color) => (
                  <Badge key={color} variant="outline">{color}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {row.importMessage && (
          <div className={cn("text-sm", row.import === "error" ? "text-destructive" : "text-muted-foreground")}>
            {row.importMessage}
            {row.product && row.import === "created" && (
              <Link href="/dashboard/products/to-complete" className="ms-2 text-primary hover:underline">
                {t("completeLink")}
              </Link>
            )}
          </div>
        )}
        {row.warnings && row.warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-amber-600">
            {row.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1">
                <IconAlertTriangle className="mt-0.5 size-3 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function BulkImportPage() {
  const { hasPermission } = usePermissions()
  // MobileAPI (brands.manage) and product creation (products:write) are both required
  if (!hasPermission("brands.manage") || !hasPermission("products:write")) return <AccessDenied />
  return <BulkImportContent />
}
