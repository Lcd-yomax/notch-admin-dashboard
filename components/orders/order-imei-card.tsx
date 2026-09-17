"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { toast } from "sonner"
import { IconBarcode, IconCircleCheckFilled } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatVariationLabel, type VariationLabelInput } from "@/lib/products/smartphone"
import type { OrderImeiItem } from "@/lib/orders/imei"

export interface OrderImeiCardItem {
  id: string
  quantity: number
  product_name: string
  variation: VariationLabelInput
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

function AssignInput({
  orderId,
  orderItemId,
  inputRef,
  onAssigned,
}: {
  orderId: string
  orderItemId: string
  inputRef?: (el: HTMLInputElement | null) => void
  onAssigned: () => void
}) {
  const t = useTranslations("orderImei")
  const [imei, setImei] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const assign = async () => {
    const value = imei.replace(/\s/g, "")
    if (!value || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_item_id: orderItemId, imei: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Exact message returned by assign_device_unit
        setError(data.error || t("assignError"))
        return
      }
      setImei("")
      toast.success(t("assigned", { imei: value }))
      onAssigned()
    } catch {
      setError(t("assignError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconBarcode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={imei}
            onChange={(e) => {
              setImei(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                assign()
              }
            }}
            placeholder={t("scanPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
            className="pl-9 font-mono"
            aria-invalid={!!error}
          />
        </div>
        <Button type="button" onClick={assign} disabled={saving || !imei.trim()}>
          {saving && <Spinner className="mr-1" />}
          {t("assign")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function OrderImeiCard({
  orderId,
  items,
  onChanged,
}: {
  orderId: string
  items: OrderImeiCardItem[]
  onChanged: () => void
}) {
  const t = useTranslations("orderImei")
  const ti = useTranslations("imeiInventory")
  const { data: units, mutate, isLoading } = useSWR<OrderImeiItem[]>(`/api/orders/${orderId}/units`, fetcher)
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({})

  const handleAssigned = async () => {
    await mutate()
    onChanged()
    // Keep scanning: focus the next empty input
    setTimeout(() => {
      const next = Object.values(inputs.current).find((el) => el && !el.value)
      next?.focus()
    }, 50)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconBarcode className="size-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          items.map((item) => {
            const itemUnits = units?.find((u) => u.order_item_id === item.id)?.units || []
            const soldCount = itemUnits.filter((u) => u.status === "sold").length
            const remaining = Math.max(0, item.quantity - soldCount)
            return (
              <div key={item.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{formatVariationLabel(item.variation)}</p>
                  </div>
                  <Badge variant={remaining === 0 ? "default" : "outline"}>
                    {t("progress", { assigned: soldCount, quantity: item.quantity })}
                  </Badge>
                </div>
                {itemUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-2 text-sm">
                    {unit.status === "sold" ? (
                      <IconCircleCheckFilled className="size-4 shrink-0 text-green-600" />
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {ti(`statuses.${unit.status as "sold"}`)}
                      </Badge>
                    )}
                    <span className="font-mono">{unit.imei}</span>
                    {unit.imei2 && <span className="font-mono text-muted-foreground">/ {unit.imei2}</span>}
                  </div>
                ))}
                {Array.from({ length: remaining }, (_, i) => (
                  <AssignInput
                    key={`${item.id}-${soldCount}-${i}`}
                    orderId={orderId}
                    orderItemId={item.id}
                    inputRef={(el) => {
                      inputs.current[`${item.id}-${i}`] = el
                    }}
                    onAssigned={handleAssigned}
                  />
                ))}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
