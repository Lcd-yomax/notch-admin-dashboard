"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { usePermissions } from "@/hooks/use-permissions"
import { isShippingChange } from "@/lib/orders/shipping"

async function fetchImeiStatus(orderId: string): Promise<{ missing: number; sold_units: number } | null> {
  try {
    const res = await fetch(`/api/orders/${orderId}/imei-status`)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

/**
 * Guards order status changes for smartphones:
 * - confirmShipping(): warns when phones have no IMEI before shipped / delivered
 * - offerRelease(): after a cancellation, offers to put the sold phones back in stock
 * Render `dialogs` once in the page.
 */
export function useOrderImeiGuard() {
  const t = useTranslations("orderImei")
  const tc = useTranslations("common")
  const { hasPermission } = usePermissions()

  const [missing, setMissing] = React.useState<number | null>(null)
  const resolver = React.useRef<((ok: boolean) => void) | null>(null)
  const [release, setRelease] = React.useState<{ orderId: string; count: number; onDone?: () => void } | null>(null)
  const [releasing, setReleasing] = React.useState(false)

  const confirmShipping = React.useCallback(
    async (
      orderId: string,
      change: { status?: string | null; previousStatus?: string | null; deliveryStatus?: string | null; previousDeliveryStatus?: string | null }
    ) => {
      if (!isShippingChange(change)) return true
      const status = await fetchImeiStatus(orderId)
      if (!status || status.missing === 0) return true
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve
        setMissing(status.missing)
      })
    },
    []
  )

  const closeConfirm = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setMissing(null)
  }

  const offerRelease = React.useCallback(
    async (orderId: string, change: { status?: string | null; previousStatus?: string | null }, onDone?: () => void) => {
      if (change.status !== "cancelled" || change.previousStatus === "cancelled") return
      if (!hasPermission("inventory.imei")) return
      const status = await fetchImeiStatus(orderId)
      if (status && status.sold_units > 0) setRelease({ orderId, count: status.sold_units, onDone })
    },
    [hasPermission]
  )

  const handleRelease = async () => {
    if (!release) return
    setReleasing(true)
    try {
      const res = await fetch(`/api/orders/${release.orderId}/units/release`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || t("releaseError"))
      } else {
        toast.success(t("releaseSuccess", { count: data.released }))
      }
      release.onDone?.()
      setRelease(null)
    } finally {
      setReleasing(false)
    }
  }

  const dialogs = (
    <>
      <AlertDialog open={missing !== null} onOpenChange={(open) => { if (!open) closeConfirm(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("missingTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("missingDescription", { count: missing ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => closeConfirm(false)}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => closeConfirm(true)}>{t("continue")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!release} onOpenChange={(open) => { if (!open && !releasing) setRelease(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("releaseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("releaseDescription", { count: release?.count ?? 0 })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>{t("keepSold")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={releasing}
              onClick={(e) => {
                e.preventDefault()
                handleRelease()
              }}
            >
              {releasing && <Spinner className="mr-1" />}
              {t("putBackInStock")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return { confirmShipping, offerRelease, dialogs }
}
