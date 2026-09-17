"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconArrowDown, IconArrowUp, IconDeviceMobile, IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { emptySpec, orderSpecs, type SpecDraft } from "@/lib/products/form"
import { SMARTPHONE_SPEC_TEMPLATE, sameText } from "@/lib/products/smartphone"

/** Adds the rows of the smartphone template that are missing. Never overwrites existing rows. */
export function addSmartphoneTemplate(rows: SpecDraft[]) {
  const next = orderSpecs(rows)
  for (const tpl of SMARTPHONE_SPEC_TEMPLATE) {
    const exists = next.some((r) => sameText(r.group_name, tpl.group_name) && sameText(r.label, tpl.label))
    if (exists) continue
    // Insert after the last row of the same group, or at the end for a new group
    let index = -1
    next.forEach((r, i) => {
      if (sameText(r.group_name, tpl.group_name)) index = i
    })
    const row = emptySpec({ group_name: tpl.group_name, label: tpl.label })
    if (index === -1) next.push(row)
    else next.splice(index + 1, 0, row)
  }
  return next
}

export function SpecsEditor({
  rows,
  onChange,
}: {
  rows: SpecDraft[]
  onChange: (rows: SpecDraft[]) => void
}) {
  const t = useTranslations("productForm")
  const [newGroup, setNewGroup] = React.useState("")

  const ordered = orderSpecs(rows)
  const groups: string[] = []
  for (const row of ordered) {
    if (!groups.some((g) => sameText(g, row.group_name))) groups.push(row.group_name)
  }

  const update = (key: string, patch: Partial<SpecDraft>) => {
    onChange(ordered.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const renameGroup = (from: string, to: string) => {
    onChange(ordered.map((r) => (sameText(r.group_name, from) ? { ...r, group_name: to } : r)))
  }

  const move = (key: string, direction: -1 | 1) => {
    const index = ordered.findIndex((r) => r.key === key)
    const row = ordered[index]
    // Find the neighbour inside the same group
    let target = index + direction
    while (target >= 0 && target < ordered.length && !sameText(ordered[target].group_name, row.group_name)) {
      target += direction
    }
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    next[index] = next[target]
    next[target] = row
    onChange(next)
  }

  const addRow = (group: string) => {
    const next = [...ordered]
    let index = -1
    next.forEach((r, i) => {
      if (sameText(r.group_name, group)) index = i
    })
    next.splice(index + 1, 0, emptySpec({ group_name: group }))
    onChange(next)
  }

  const addGroup = () => {
    const name = newGroup.trim()
    if (!name) return
    if (groups.some((g) => sameText(g, name))) addRow(name)
    else onChange([...ordered, emptySpec({ group_name: name })])
    setNewGroup("")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{t("specs")}</h3>
          <p className="text-xs text-muted-foreground">{t("specsHint")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(addSmartphoneTemplate(rows))}>
          <IconDeviceMobile className="size-3.5" />
          {t("smartphoneTemplate")}
        </Button>
      </div>

      {groups.map((group) => {
        const groupRows = ordered.filter((r) => sameText(r.group_name, group))
        return (
          // Keyed by the first row so renaming the group does not remount the input
          <div key={groupRows[0].key} className="rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
              <Input
                value={group}
                onChange={(e) => renameGroup(group, e.target.value)}
                className="h-8 max-w-xs font-medium"
                aria-label={t("groupName")}
              />
              <span className="text-xs text-muted-foreground">{t("rowsCount", { count: groupRows.length })}</span>
            </div>
            <div className="divide-y">
              {groupRows.map((row, i) => (
                <div
                  key={row.key}
                  className="grid grid-cols-2 gap-2 px-3 py-2 md:grid-cols-[1fr_1.4fr_1fr_1.4fr_auto] md:items-center"
                >
                  <Input
                    value={row.label}
                    onChange={(e) => update(row.key, { label: e.target.value })}
                    placeholder={t("specLabel")}
                    className="h-8"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => update(row.key, { value: e.target.value })}
                    placeholder={t("specValue")}
                    className="h-8"
                  />
                  <Input
                    value={row.label_ar}
                    onChange={(e) => update(row.key, { label_ar: e.target.value })}
                    placeholder={t("specLabelAr")}
                    className="h-8"
                    dir="rtl"
                  />
                  <Input
                    value={row.value_ar}
                    onChange={(e) => update(row.key, { value_ar: e.target.value })}
                    placeholder={t("specValueAr")}
                    className="h-8"
                    dir="rtl"
                  />
                  <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={i === 0}
                      onClick={() => move(row.key, -1)}
                      title={t("moveUp")}
                    >
                      <IconArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={i === groupRows.length - 1}
                      onClick={() => move(row.key, 1)}
                      title={t("moveDown")}
                    >
                      <IconArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onChange(ordered.filter((r) => r.key !== row.key))}
                      title={t("deleteRow")}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => addRow(group)}>
                <IconPlus className="size-3.5" />
                {t("addRow")}
              </Button>
            </div>
          </div>
        )
      })}

      <div className="flex gap-2">
        <Input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addGroup()
            }
          }}
          placeholder={t("newGroupPlaceholder")}
          className="max-w-xs"
        />
        <Button type="button" variant="outline" onClick={addGroup} disabled={!newGroup.trim()}>
          <IconPlus className="size-3.5" />
          {t("addGroup")}
        </Button>
      </div>
      {rows.length > 0 && <p className="text-xs text-muted-foreground">{t("emptyValuesNotSaved")}</p>}
    </div>
  )
}
