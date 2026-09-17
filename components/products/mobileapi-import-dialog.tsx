"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconArrowLeft, IconDeviceMobile, IconSearch } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ImportedVariants } from "@/components/products/variant-generator-dialog"
import { formatStorage, sameText } from "@/lib/products/smartphone"
import type { ImportedSpec, MobileApiPreview, MobileApiSearchResult } from "@/lib/mobileapi/types"

export interface MobileApiApplyResult {
  deviceId: string
  brand: { kind: "existing"; id: string } | { kind: "new"; name: string } | null
  specs: { rows: ImportedSpec[]; mode: "fill" | "replace" } | null
  variants: ImportedVariants | null
  openGenerator: boolean
}

const MIN_QUERY = 3
const DEBOUNCE_MS = 600

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "MobileAPI ne répond pas, réessayez")
  return data as T
}

export function MobileApiImportDialog({
  open,
  onOpenChange,
  productName,
  deviceId,
  brands,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  /** When set, details are loaded directly (no search credit) */
  deviceId: string | null
  brands: { id: string; name: string }[]
  onApply: (result: MobileApiApplyResult) => void
}) {
  const t = useTranslations("mobileapi")
  const tc = useTranslations("common")

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<MobileApiSearchResult[] | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [preview, setPreview] = React.useState<MobileApiPreview | null>(null)
  const [loadingDetails, setLoadingDetails] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [useBrand, setUseBrand] = React.useState(true)
  const [useSpecs, setUseSpecs] = React.useState(true)
  const [specsMode, setSpecsMode] = React.useState<"fill" | "replace">("fill")
  const [useVariants, setUseVariants] = React.useState(true)
  const [checkedCombos, setCheckedCombos] = React.useState<number[]>([])
  const [colors, setColors] = React.useState<{ original: string; fr: string; checked: boolean }[]>([])

  const lastSearched = React.useRef("")
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const typedRef = React.useRef(false)

  const loadDetails = React.useCallback(async (id: string) => {
    setLoadingDetails(true)
    setError(null)
    try {
      const data = await getJson<MobileApiPreview>(`/api/mobileapi/devices/${id}`)
      setPreview(data)
      setUseBrand(!!data.manufacturer)
      setUseSpecs(data.specs.length > 0)
      setSpecsMode("fill")
      setUseVariants(data.variants.length > 0)
      setCheckedCombos(data.variants.map((_, i) => i))
      setColors(data.colors.map((c) => ({ ...c, checked: true })))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingDetails(false)
    }
  }, [])

  // Reset when opened; "Mettre à jour depuis MobileAPI" goes straight to the details
  React.useEffect(() => {
    if (!open) return
    setQuery(productName)
    setResults(null)
    setPreview(null)
    setError(null)
    lastSearched.current = ""
    typedRef.current = false
    if (deviceId) loadDetails(deviceId)
  }, [open, deviceId, productName, loadDetails])

  const runSearch = React.useCallback(async (value: string) => {
    const q = value.trim()
    if (q.length < MIN_QUERY) {
      setError(t("minChars"))
      return
    }
    if (q === lastSearched.current) return
    lastSearched.current = q
    setSearching(true)
    setError(null)
    try {
      setResults(await getJson<MobileApiSearchResult[]>(`/api/mobileapi/search?q=${encodeURIComponent(q)}`))
    } catch (e) {
      // Allow retrying the same query
      lastSearched.current = ""
      setResults(null)
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }, [t])

  // 600 ms debounce, only after the user typed (each search costs a credit)
  React.useEffect(() => {
    if (!open || !typedRef.current || preview) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < MIN_QUERY) return
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, preview, runSearch])

  const matchedBrand = preview?.manufacturer
    ? brands.find((b) => sameText(b.name, preview.manufacturer))
    : undefined

  const apply = (openGenerator: boolean) => {
    if (!preview) return
    const combos = preview.variants.filter((_, i) => checkedCombos.includes(i))
    const pickedColors = colors.filter((c) => c.checked && c.fr.trim()).map((c) => c.fr.trim())
    onApply({
      deviceId: preview.device_id,
      brand:
        useBrand && preview.manufacturer
          ? matchedBrand
            ? { kind: "existing", id: matchedBrand.id }
            : { kind: "new", name: preview.manufacturer }
          : null,
      specs: useSpecs && preview.specs.length > 0 ? { rows: preview.specs, mode: specsMode } : null,
      variants: useVariants && combos.length > 0 ? { combos, colors: pickedColors } : null,
      openGenerator: openGenerator && useVariants && combos.length > 0,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deviceId ? t("updateTitle") : t("importTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {!preview && !deviceId && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              // Nested inside the product form through a portal: do not submit it
              e.stopPropagation()
              if (debounceRef.current) clearTimeout(debounceRef.current)
              runSearch(query)
            }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => {
                typedRef.current = true
                setQuery(e.target.value)
              }}
              placeholder={t("searchPlaceholder")}
              autoFocus
            />
            <Button type="submit" disabled={searching || query.trim().length < MIN_QUERY}>
              {searching ? <Spinner /> : <IconSearch className="size-4" />}
              <span className="hidden sm:inline">{tc("search")}</span>
            </Button>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {(loadingDetails || (searching && !results)) && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner />
            {loadingDetails ? t("loadingDetails") : t("searching")}
          </div>
        )}

        {/* ── Search results ─────────────────────────────────────────────── */}
        {!preview && !loadingDetails && results && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("pickResult")}</p>
            <div className="divide-y rounded-lg border">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadDetails(r.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                >
                  {r.image_b64 ? (
                    <img
                      src={`data:image/jpeg;base64,${r.image_b64}`}
                      alt=""
                      className="size-12 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                      <IconDeviceMobile className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.manufacturer_name, r.release_year].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {r.match_certainty && <Badge variant="secondary">{r.match_certainty}</Badge>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Preview ────────────────────────────────────────────────────── */}
        {preview && !loadingDetails && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {!deviceId && (
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setPreview(null)}>
                  <IconArrowLeft className="size-4" />
                </Button>
              )}
              <div>
                <p className="font-medium">{preview.name}</p>
                <p className="text-xs text-muted-foreground">{t("deviceId", { id: preview.device_id })}</p>
              </div>
            </div>

            {preview.manufacturer && (
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Checkbox checked={useBrand} onCheckedChange={(v) => setUseBrand(!!v)} />
                <span className="font-medium">{t("brand")} :</span>
                {matchedBrand
                  ? t("brandExisting", { name: matchedBrand.name })
                  : t("brandCreate", { name: preview.manufacturer })}
              </label>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={useSpecs}
                  onCheckedChange={(v) => setUseSpecs(!!v)}
                  disabled={preview.specs.length === 0}
                />
                {t("specs", { count: preview.specs.length })}
              </label>
              {preview.specs.length > 0 && (
                <>
                  <RadioGroup
                    value={specsMode}
                    onValueChange={(v) => setSpecsMode(v as "fill" | "replace")}
                    className="flex flex-wrap gap-4"
                    disabled={!useSpecs}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fill" id="specs-fill" />
                      <Label htmlFor="specs-fill" className="font-normal">{t("specsFill")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="replace" id="specs-replace" />
                      <Label htmlFor="specs-replace" className="font-normal">{t("specsReplace")}</Label>
                    </div>
                  </RadioGroup>
                  <div className="max-h-64 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>{t("group")}</TableHead>
                          <TableHead>{t("label")}</TableHead>
                          <TableHead>{t("value")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.specs.map((s) => (
                          <TableRow key={`${s.group_name}-${s.label}`}>
                            <TableCell className="text-muted-foreground">{s.group_name}</TableCell>
                            <TableCell>{s.label}</TableCell>
                            <TableCell className="whitespace-normal">{s.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={useVariants}
                  onCheckedChange={(v) => setUseVariants(!!v)}
                  disabled={preview.variants.length === 0}
                />
                {t("variants", { count: preview.variants.length })}
              </label>
              {preview.variants.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {preview.variants.map((v, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checkedCombos.includes(i)}
                        disabled={!useVariants}
                        onCheckedChange={(checked) =>
                          setCheckedCombos(checked ? [...checkedCombos, i] : checkedCombos.filter((x) => x !== i))
                        }
                      />
                      {formatStorage(v.storage_gb)}
                      {v.ram_gb ? ` · ${v.ram_gb} Go RAM` : ` · ${t("ramUnknown")}`}
                    </label>
                  ))}
                </div>
              )}
              {colors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("colorsHint")}</p>
                  {colors.map((c, i) => (
                    <div key={c.original} className="flex items-center gap-2">
                      <Checkbox
                        checked={c.checked}
                        disabled={!useVariants}
                        onCheckedChange={(checked) =>
                          setColors(colors.map((x, j) => (j === i ? { ...x, checked: !!checked } : x)))
                        }
                      />
                      <span className="w-28 shrink-0 truncate text-sm text-muted-foreground">{c.original}</span>
                      <Input
                        value={c.fr}
                        disabled={!useVariants || !c.checked}
                        onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, fr: e.target.value } : x)))}
                        className="h-8"
                        aria-label={t("frenchName", { name: c.original })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{t("applyHint")}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          {preview && !loadingDetails && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => apply(true)}
                disabled={!useVariants || checkedCombos.length === 0}
              >
                {t("sendToGenerator")}
              </Button>
              <Button type="button" onClick={() => apply(false)}>
                {t("apply")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
