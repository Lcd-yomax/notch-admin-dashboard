"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import {
  IconBell,
  IconBellFilled,
  IconShoppingCart,
  IconStar,
  IconCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  type: "new_order" | "new_review"
  title: string
  message: string
  is_read: boolean
  reference_id: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function NotificationBell() {
  const t = useTranslations("notifications")
  const router = useRouter()

  function timeAgo(dateStr: string) {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return t("justNow")
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t("minutesAgo", { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t("hoursAgo", { count: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t("daysAgo", { count: days })
    return date.toLocaleDateString()
  }

  const { data: notifications = [], mutate } = useSWR<Notification[]>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 15000 } // poll every 15 seconds
  )

  const [open, setOpen] = React.useState(false)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PUT" })
    mutate()
  }

  const markAllAsRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PUT" })
    mutate()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <IconBellFilled className="size-5" />
          ) : (
            <IconBell className="size-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{t("title")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">{t("title")}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              <IconCheck className="mr-1 size-3" />
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <IconBell className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id)
                    setOpen(false)
                    if (n.type === "new_order" && n.reference_id) {
                      router.push(`/dashboard/orders/${n.reference_id}`)
                    } else if (n.type === "new_review") {
                      router.push("/dashboard/reviews")
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    !n.is_read ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {n.type === "new_order" ? (
                      <IconShoppingCart className="size-4 text-blue-500" />
                    ) : (
                      <IconStar className="size-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
