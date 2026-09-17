"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconArrowBackUp, IconPlus, IconTrash, IconWand } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { emptyVariation, type VariationDraft } from "@/lib/products/form"
import {
  CONDITION_OPTIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  formatStorage,
  type PhoneCondition,
} from "@/lib/products/smartphone"

export type VariationErrors = Record<string, { sku?: string; price?: string; form?: string }>

const NONE = "none"

export function VariationsEditor({
  rows,
  onChange,
  isSmartphone,
  errors,
  canDelete,
  onGenerate,
}: {
  rows: VariationDraft[]
  onChange: (rows: VariationDraft[]) => void
  isSmartphone: boolean
  errors: VariationErrors
  canDelete: boolean
  onGenerate?: () => void
}) {
  const t = useTranslations("productForm")

  const update = (key: string, patch: Partial<VariationDraft>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const remove = (row: VariationDraft) => {
    if (row.id) update(row.key, { deleted: true })
    else onChange(rows.filter((r) => r.key !== row.key))
  }

  const deletedCount = rows.filter((r) => r.deleted).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{t("variations")}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSmartphone && onGenerate && (
            <Button type="button" variant="outline" size="sm" onClick={onGenerate}>
              <IconWand className="size-3.5" />
              {t("generateVariants")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...rows, emptyVariation()])}
          >
            <IconPlus className="size-3.5" />
            {t("addVariation")}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noVariationsHint")}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-[180px]">{t("sku")} *</TableHead>
                {isSmartphone ? (
                  <>
                    <TableHead className="min-w-[100px]">{t("storage")}</TableHead>
                    <TableHead className="min-w-[90px]">{t("ram")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("color")}</TableHead>
                    <TableHead className="min-w-[140px]">{t("condition")}</TableHead>
                    <TableHead className="min-w-[90px]">{t("warrantyMonths")}</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="min-w-[120px]">{t("color")}</TableHead>
                    <TableHead className="min-w-[90px]">{t("size")}</TableHead>
                  </>
                )}
                <TableHead className="min-w-[100px]">{t("price")} *</TableHead>
                <TableHead className="min-w-[100px]">{t("priceDisplay")}</TableHead>
                <TableHead className="min-w-[100px]">{t("discountLabel")}</TableHead>
                <TableHead className="min-w-[80px]">{t("stock")}</TableHead>
                <TableHead>{t("active")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rowErrors = errors[row.key]
                const disabled = !!row.deleted
                return (
                  <React.Fragment key={row.key}>
                    <TableRow className={cn(row.deleted && "opacity-50")}>
                      <TableCell className="align-top">
                        <Input
                          value={row.sku}
                          onChange={(e) => update(row.key, { sku: e.target.value })}
                          placeholder={isSmartphone ? "SAMSUNG-GALAXY-A55-8-256-NOIR" : t("skuPlaceholder")}
                          className={cn("h-8 font-mono text-xs", row.deleted && "line-through")}
                          aria-invalid={!!rowErrors?.sku}
                          disabled={disabled}
                        />
                        {rowErrors?.sku && <p className="mt-1 text-xs text-destructive">{rowErrors.sku}</p>}
                      </TableCell>
                      {isSmartphone ? (
                        <>
                          <TableCell className="align-top">
                            <Select
                              value={row.storage_gb || NONE}
                              onValueChange={(val) => update(row.key, { storage_gb: val === NONE ? "" : val })}
                              disabled={disabled}
                            >
                              <SelectTrigger size="sm" className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>—</SelectItem>
                                {STORAGE_OPTIONS.map((gb) => (
                                  <SelectItem key={gb} value={String(gb)}>{formatStorage(gb)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={row.ram_gb || NONE}
                              onValueChange={(val) => update(row.key, { ram_gb: val === NONE ? "" : val })}
                              disabled={disabled}
                            >
                              <SelectTrigger size="sm" className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>—</SelectItem>
                                {RAM_OPTIONS.map((gb) => (
                                  <SelectItem key={gb} value={String(gb)}>{gb} Go</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              value={row.color}
                              onChange={(e) => update(row.key, { color: e.target.value })}
                              placeholder={t("colorPlaceholder")}
                              className="h-8"
                              disabled={disabled}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={row.condition}
                              onValueChange={(val) => update(row.key, { condition: val as PhoneCondition })}
                              disabled={disabled}
                            >
                              <SelectTrigger size="sm" className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_OPTIONS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{t(`conditions.${c.value}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              min="0"
                              value={row.warranty_months}
                              onChange={(e) => update(row.key, { warranty_months: e.target.value })}
                              className="h-8"
                              disabled={disabled}
                            />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="align-top">
                            <Input
                              value={row.color}
                              onChange={(e) => update(row.key, { color: e.target.value })}
                              placeholder={t("colorPlaceholder")}
                              className="h-8"
                              disabled={disabled}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              value={row.size}
                              onChange={(e) => update(row.key, { size: e.target.value })}
                              placeholder={t("sizePlaceholder")}
                              className="h-8"
                              disabled={disabled}
                            />
                          </TableCell>
                        </>
                      )}
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.price}
                          onChange={(e) => update(row.key, { price: e.target.value })}
                          placeholder="0.00"
                          className="h-8"
                          aria-invalid={!!rowErrors?.price}
                          disabled={disabled}
                        />
                        {rowErrors?.price && <p className="mt-1 text-xs text-destructive">{rowErrors.price}</p>}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.price_display}
                          onChange={(e) => update(row.key, { price_display: e.target.value })}
                          placeholder="0.00"
                          className="h-8"
                          disabled={disabled}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.discount_label}
                          onChange={(e) => update(row.key, { discount_label: e.target.value })}
                          placeholder="-10%"
                          className="h-8"
                          disabled={disabled}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          value={row.stock}
                          onChange={(e) => update(row.key, { stock: e.target.value })}
                          className="h-8"
                          disabled={disabled}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex h-8 items-center">
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(checked) => update(row.key, { is_active: checked })}
                            disabled={disabled}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {row.deleted ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title={t("restore")}
                            onClick={() => update(row.key, { deleted: false })}
                          >
                            <IconArrowBackUp className="size-3.5" />
                          </Button>
                        ) : (!row.id || canDelete) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title={t("removeVariation")}
                            onClick={() => remove(row)}
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {rowErrors?.form && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={isSmartphone ? 13 : 10} className="pt-0 text-xs text-destructive">
                          {row.sku || t("variation")} : {rowErrors.form}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {deletedCount > 0 && (
        <p className="text-xs text-destructive">{t("variationsWillBeDeleted", { count: deletedCount })}</p>
      )}
    </div>
  )
}
