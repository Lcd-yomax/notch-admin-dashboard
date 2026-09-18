"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconAlertTriangle, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { PageHeader } from "@/components/page-header"
import { AccessDenied, Can } from "@/components/access"
import { MissingPhoto } from "@/components/products/missing-photo"
import { PackForm, type PackRow } from "@/components/packs/pack-form"
import { usePermissions } from "@/hooks/use-permissions"
import { formatVariationLabel } from "@/lib/products/smartphone"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Failed to fetch")
  return data
}

function money(value: number) {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DH`
}

function PacksContent() {
  const t = useTranslations("packs")
  const tc = useTranslations("common")
  const { hasPermission } = usePermissions()
  const canWrite = hasPermission("products:write")
  const { data: packs = [], error, isLoading, mutate } = useSWR<PackRow[]>("/api/packs", fetcher)

  const [editing, setEditing] = React.useState<PackRow | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<PackRow | null>(null)
  const [busy, setBusy] = React.useState(false)

  const handleSaved = ({ blockers }: { blockers: string[] }) => {
    mutate()
    setEditing(null)
    if (blockers.length > 0) {
      toast.warning(t("savedInactive"), { description: blockers.join("\n") })
    } else {
      toast.success(t("saveSuccess"))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      const res = await fetch(`/api/packs/${deleting.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || t("deleteError"))
        return
      }
      toast.success(t("deleteSuccess"))
      setDeleting(null)
      mutate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")}>
        {canWrite && (
          <Button onClick={() => setEditing("new")}>
            <IconPlus />
            <span className="hidden sm:inline">{t("addPack")}</span>
          </Button>
        )}
      </PageHeader>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error.message}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="size-6" /></div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-12 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          {canWrite && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <IconPlus className="size-4" />
              {t("addPack")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack) => {
            const visible = pack.is_active && pack.pricing.issues.length === 0
            return (
              <div key={pack.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  {pack.image_url ? (
                    <img src={pack.image_url} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
                  ) : (
                    <MissingPhoto className="size-16" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{pack.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={visible ? "default" : "secondary"}>{visible ? t("online") : t("offline")}</Badge>
                      <Badge variant="outline">-{Number(pack.discount_percent)}%</Badge>
                    </div>
                  </div>
                </div>

                <ul className="space-y-0.5 text-sm text-muted-foreground">
                  {pack.pack_items.map((item) => (
                    <li key={item.variation_id} className="truncate">
                      {item.quantity} × {item.product_variations?.products?.name ?? "—"}
                      {item.product_variations && formatVariationLabel(item.product_variations)
                        ? ` · ${formatVariationLabel(item.product_variations)}`
                        : ""}
                    </li>
                  ))}
                </ul>

                <div className="flex items-baseline gap-2">
                  {pack.pricing.hidePrice ? (
                    <span className="text-sm font-medium">{t("priceOnRequest")}</span>
                  ) : (
                    <>
                      <span className="text-lg font-semibold tabular-nums">{money(pack.pricing.packPrice)}</span>
                      <span className="text-sm text-muted-foreground line-through tabular-nums">{money(pack.pricing.originalPrice)}</span>
                    </>
                  )}
                </div>

                {pack.pricing.issues.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-amber-600">
                    {pack.pricing.issues.map((issue) => (
                      <li key={issue} className="flex items-start gap-1">
                        <IconAlertTriangle className="mt-0.5 size-3 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}

                {canWrite && (
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(pack)}>
                      <IconEdit className="size-4" />
                      {tc("edit")}
                    </Button>
                    {hasPermission("products:delete") && (
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(pack)} aria-label={tc("delete")}>
                        <IconTrash className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addPack") : t("editPack")}</DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <PackForm
              key={editing === "new" ? "new" : editing.id}
              pack={editing === "new" ? null : editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deletePack")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm", { name: deleting?.name ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>{tc("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Spinner className="mr-1" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PacksPage() {
  return (
    <Can permission={["products:read", "products:write"]} fallback={<AccessDenied />}>
      <PacksContent />
    </Can>
  )
}
