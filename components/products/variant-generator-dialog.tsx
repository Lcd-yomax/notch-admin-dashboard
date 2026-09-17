"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconX } from "@tabler/icons-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { emptyVariation, type VariationDraft } from "@/lib/products/form"
import {
  CONDITION_OPTIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  buildSku,
  formatStorage,
  sameText,
  type PhoneCondition,
} from "@/lib/products/smartphone"

export interface ImportedVariants {
  combos: { storage_gb: number; ram_gb: number | null }[]
  colors: string[]
}

type Mode = "manual" | "import"

function ChipToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "outline"}
      className="h-8 rounded-full"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function comboKey(storage: number, ram: number | null) {
  return `${storage}-${ram ?? ""}`
}

export function VariantGeneratorDialog({
  open,
  onOpenChange,
  initialMode,
  imported,
  brandName,
  productName,
  existing,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode: Mode
  imported: ImportedVariants | null
  brandName: string | null
  productName: string
  existing: VariationDraft[]
  onAdd: (rows: VariationDraft[]) => void
}) {
  const t = useTranslations("productForm")
  const tc = useTranslations("common")

  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [storages, setStorages] = React.useState<number[]>([])
  const [rams, setRams] = React.useState<number[]>([])
  const [selectedCombos, setSelectedCombos] = React.useState<string[]>([])
  const [colors, setColors] = React.useState<string[]>([])
  const [colorInput, setColorInput] = React.useState("")
  const [condition, setCondition] = React.useState<PhoneCondition>("neuf")
  const [warranty, setWarranty] = React.useState("12")
  const [prices, setPrices] = React.useState<Record<number, string>>({})

  // Reset the generator each time it is opened
  React.useEffect(() => {
    if (!open) return
    const nextMode = initialMode === "import" && imported ? "import" : "manual"
    setMode(nextMode)
    setStorages([])
    setRams([])
    setSelectedCombos(imported ? imported.combos.map((c) => comboKey(c.storage_gb, c.ram_gb)) : [])
    setColors(nextMode === "import" && imported ? imported.colors : [])
    setColorInput("")
    setCondition("neuf")
    setWarranty("12")
    setPrices({})
  }, [open, initialMode, imported])

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const addColors = (value: string) => {
    const names = value.split(",").map((c) => c.trim()).filter(Boolean)
    if (names.length === 0) return
    setColors((prev) => [...prev, ...names.filter((n) => !prev.some((p) => sameText(p, n)))])
    setColorInput("")
  }

  const combos = React.useMemo(() => {
    if (mode === "import") {
      return (imported?.combos || []).filter((c) => selectedCombos.includes(comboKey(c.storage_gb, c.ram_gb)))
    }
    const sortedStorages = [...storages].sort((a, b) => a - b)
    const sortedRams = [...rams].sort((a, b) => a - b)
    return sortedStorages.flatMap((storage_gb) =>
      (sortedRams.length > 0 ? sortedRams : [null]).map((ram_gb) => ({ storage_gb, ram_gb }))
    )
  }, [mode, imported, selectedCombos, storages, rams])

  const priceStorages = React.useMemo(
    () => [...new Set(combos.map((c) => c.storage_gb))].sort((a, b) => a - b),
    [combos]
  )

  const preview = React.useMemo(() => {
    const colorList = colors.length > 0 ? colors : [""]
    const active = existing.filter((v) => !v.deleted)
    return combos.flatMap(({ storage_gb, ram_gb }) =>
      colorList.map((color) => {
        const sku = buildSku({ brand: brandName, productName, ramGb: ram_gb, storageGb: storage_gb, color })
        const exists = active.some(
          (v) =>
            sameText(v.sku, sku) ||
            (v.storage_gb === String(storage_gb) &&
              (v.ram_gb || "") === (ram_gb ? String(ram_gb) : "") &&
              sameText(v.color, color))
        )
        return { storage_gb, ram_gb, color, sku, exists }
      })
    )
  }, [combos, colors, existing, brandName, productName])

  const toAdd = preview.filter((p) => !p.exists)

  const handleAdd = () => {
    onAdd(
      toAdd.map((p) =>
        emptyVariation({
          sku: p.sku,
          color: p.color,
          storage_gb: String(p.storage_gb),
          ram_gb: p.ram_gb ? String(p.ram_gb) : "",
          condition,
          warranty_months: warranty,
          price: prices[p.storage_gb] || "",
        })
      )
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("generateVariants")}</DialogTitle>
          <DialogDescription>{t("generatorDesc")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(val) => {
            setMode(val as Mode)
            if (val === "import" && imported) setColors(imported.colors)
          }}
        >
          <TabsList>
            <TabsTrigger value="manual">{t("generatorManual")}</TabsTrigger>
            <TabsTrigger value="import" disabled={!imported}>{t("generatorFromImport")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {mode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label>{t("storage")}</Label>
                <div className="flex flex-wrap gap-2">
                  {STORAGE_OPTIONS.map((gb) => (
                    <ChipToggle key={gb} selected={storages.includes(gb)} onClick={() => setStorages(toggle(storages, gb))}>
                      {formatStorage(gb)}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("ram")}</Label>
                <div className="flex flex-wrap gap-2">
                  {RAM_OPTIONS.map((gb) => (
                    <ChipToggle key={gb} selected={rams.includes(gb)} onClick={() => setRams(toggle(rams, gb))}>
                      {gb} Go
                    </ChipToggle>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>{t("importedCombos")}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(imported?.combos || []).map((c) => {
                  const key = comboKey(c.storage_gb, c.ram_gb)
                  return (
                    <label key={key} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Checkbox
                        checked={selectedCombos.includes(key)}
                        onCheckedChange={() => setSelectedCombos(toggle(selectedCombos, key))}
                      />
                      {formatStorage(c.storage_gb)}
                      {c.ram_gb ? ` · ${c.ram_gb} Go RAM` : ` · ${t("ramUnknown")}`}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="generator-colors">{t("colors")}</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color, i) =>
                mode === "import" ? (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={color}
                      onChange={(e) => setColors(colors.map((c, j) => (j === i ? e.target.value : c)))}
                      className="h-8 w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setColors(colors.filter((_, j) => j !== i))}
                    >
                      <IconX className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Badge key={i} variant="secondary" className="gap-1 py-1">
                    {color}
                    <button
                      type="button"
                      onClick={() => setColors(colors.filter((_, j) => j !== i))}
                      aria-label={tc("delete")}
                    >
                      <IconX className="size-3" />
                    </button>
                  </Badge>
                )
              )}
            </div>
            <Input
              id="generator-colors"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addColors(colorInput)
                }
              }}
              onBlur={() => addColors(colorInput)}
              placeholder={t("colorsPlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("condition")}</Label>
              <Select value={condition} onValueChange={(val) => setCondition(val as PhoneCondition)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{t(`conditions.${c.value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="generator-warranty">{t("warrantyMonths")}</Label>
              <Input
                id="generator-warranty"
                type="number"
                min="0"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
              />
            </div>
          </div>

          {priceStorages.length > 0 && (
            <div className="space-y-2">
              <Label>{t("pricePerStorage")}</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {priceStorages.map((gb) => (
                  <div key={gb} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-sm text-muted-foreground">{formatStorage(gb)}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prices[gb] || ""}
                      onChange={(e) => setPrices({ ...prices, [gb]: e.target.value })}
                      placeholder="DH"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("preview")}</Label>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("previewEmpty")}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t("sku")}</TableHead>
                      <TableHead>{t("storage")}</TableHead>
                      <TableHead>{t("ram")}</TableHead>
                      <TableHead>{t("color")}</TableHead>
                      <TableHead>{t("price")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((p) => (
                      <TableRow key={p.sku + p.color} className={cn(p.exists && "text-muted-foreground")}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>{formatStorage(p.storage_gb)}</TableCell>
                        <TableCell>{p.ram_gb ? `${p.ram_gb} Go` : "—"}</TableCell>
                        <TableCell>{p.color || "—"}</TableCell>
                        <TableCell>{prices[p.storage_gb] ? `${prices[p.storage_gb]} DH` : "—"}</TableCell>
                        <TableCell>
                          {p.exists ? (
                            <Badge variant="outline">{t("alreadyExists")}</Badge>
                          ) : (
                            <Badge>{t("new")}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={handleAdd} disabled={toAdd.length === 0}>
            {t("addVariants", { count: toAdd.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
