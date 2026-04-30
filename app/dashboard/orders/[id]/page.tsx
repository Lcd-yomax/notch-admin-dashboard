"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconClock,
  IconEdit,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconMail,
  IconUser,
  IconTrash,
  IconDeviceDesktopAnalytics,
} from "@tabler/icons-react"
import useSWR from "swr"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { usePermissions } from "@/hooks/use-permissions"

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  product_variations: {
    id: string
    sku: string | null
    color: string | null
    size: string | null
    products: {
      name: string
      thumbnail_url: string | null
    }
  }
}

interface OrderDetail {
  id: string
  order_number: string
  full_name: string
  email: string | null
  phone: string | null
  city: string
  address: string
  status: string
  total_amount: number
  notes: string | null
  created_at: string
  assigned_to: string | null
  assignee_name: string | null
  delivery_status: string | null
  confirmation_status: string | null
  code_suivi: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  click_id: string | null
  referrer: string | null
  order_items: OrderItem[]
}

interface ActivityEntry {
  id: string
  action: string
  old_value: string | null
  new_value: string | null
  note: string | null
  created_at: string
  user_name: string | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusClasses: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  call_1: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  call_2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  call_3: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  call_whatsapp: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  call_sms: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  no_response: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  postponed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  unreachable: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  voicemail: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  not_serious: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800",
  fake_order: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
}

const statusButtonClasses: Record<string, string> = {
  pending: "bg-yellow-600 hover:bg-yellow-700 text-white",
  confirmed: "bg-green-600 hover:bg-green-700 text-white",
  call_1: "bg-gray-600 hover:bg-gray-700 text-white",
  call_2: "bg-orange-600 hover:bg-orange-700 text-white",
  call_3: "bg-orange-600 hover:bg-orange-700 text-white",
  call_whatsapp: "bg-purple-600 hover:bg-purple-700 text-white",
  call_sms: "bg-blue-600 hover:bg-blue-700 text-white",
  no_response: "bg-violet-600 hover:bg-violet-700 text-white",
  postponed: "bg-amber-600 hover:bg-amber-700 text-white",
  unreachable: "bg-sky-600 hover:bg-sky-700 text-white",
  voicemail: "bg-indigo-600 hover:bg-indigo-700 text-white",
  cancelled: "bg-red-600 hover:bg-red-700 text-white",
  not_serious: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
  fake_order: "bg-zinc-700 hover:bg-zinc-800 text-white",
}

const deliveryStatusClasses: Record<string, string> = {
  "En attente": "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  livre: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  envois_recu: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  refuse: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  annule: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  retourne: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  stope: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  suivi: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800",
  retour_stock: "bg-amber-700 text-white border-amber-800",
  pr: "bg-orange-500 text-white border-orange-600",
  an_1: "bg-indigo-900 text-white border-indigo-950",
}

const confirmationStatusClasses: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  return: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  refund: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const { user, hasPermission } = usePermissions()

  const { data: order, isLoading, mutate } = useSWR<OrderDetail>(`/api/orders/${id}`, fetcher)
  const { data: activity = [], mutate: mutateActivity } = useSWR<ActivityEntry[]>(
    `/api/orders/${id}/activity`,
    fetcher
  )
  const { data: usersData = [] } = useSWR<any[]>("/api/users", fetcher)

  const canUpdateOrder = React.useMemo(() => {
    if (!order) return false
    return hasPermission("orders:update_status") ||
      (hasPermission("orders:update_own") && order.assigned_to === user?.id)
  }, [order, hasPermission, user?.id])

  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState("")
  const [newDeliveryStatus, setNewDeliveryStatus] = React.useState("En attente")
  const [newConfirmationStatus, setNewConfirmationStatus] = React.useState("pending")
  const [newAssignee, setNewAssignee] = React.useState("none")
  const [newCodeSuivi, setNewCodeSuivi] = React.useState("")
  const [statusNote, setStatusNote] = React.useState("")
  const [updating, setUpdating] = React.useState(false)

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return
    setUpdating(true)
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        delivery_status: newDeliveryStatus,
        confirmation_status: newConfirmationStatus,
        assigned_to: newAssignee === "none" ? null : newAssignee,
        code_suivi: newCodeSuivi || null,
        user_id: user?.id,
        note: statusNote || null,
      }),
    })
    setUpdating(false)
    setStatusDialogOpen(false)
    setStatusNote("")
    mutate()
    mutateActivity()
    toast.success(t("statusUpdateSuccess"))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">{t("noOrders")}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <IconArrowLeft className="mr-2 size-4" />
          {tc("back")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <IconArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {t("order")} #{order.order_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.assignee_name && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {order.assignee_name}
            </Badge>
          )}
          <Badge variant="outline" className={`text-sm px-3 py-1 ${statusClasses[order.status]}`}>
            {t(order.status)}
          </Badge>
          <Badge variant="outline" className={`text-sm px-3 py-1 ${deliveryStatusClasses[order.delivery_status || "En attente"]}`}>
            {order.delivery_status ? t(order.delivery_status) : "En attente"}
          </Badge>
          <Badge variant="outline" className={`text-sm px-3 py-1 ${confirmationStatusClasses[order.confirmation_status || "pending"]}`}>
            {order.confirmation_status && order.confirmation_status !== "pending" ? t(order.confirmation_status) : "Pending Payment"}
          </Badge>
          {canUpdateOrder && (
            <Button
              size="sm"
              className={statusButtonClasses[order.status]}
              onClick={() => {
                setNewStatus(order.status)
                setNewDeliveryStatus(order.delivery_status || "En attente")
                setNewConfirmationStatus(order.confirmation_status || "pending")
                setNewAssignee(order.assigned_to || "none")
                setNewCodeSuivi(order.code_suivi || "")
                setStatusDialogOpen(true)
              }}
            >
              <IconEdit className="mr-2 size-4" />
              {t("updateStatus")}
            </Button>
          )}
          {canUpdateOrder && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/orders/${order.id}/edit`}>
                <IconEdit className="mr-2 size-4" />
                {/* Could localize but using plain text for now */}
                Edit Order
              </Link>
            </Button>
          )}
          {hasPermission("orders:delete") && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <IconTrash className="mr-2 size-4" />
              {tc("delete")}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left side: order info + items */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconUser className="size-4" />
                  {t("customer")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{order.full_name}</p>
                {order.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconMail className="size-3.5" />
                    {order.email}
                  </div>
                )}
                {order.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconPhone className="size-3.5" />
                    {order.phone}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconMapPin className="size-4" />
                  {t("shipping")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{order.city}</p>
                <p className="text-sm text-muted-foreground">{order.address}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tracking Code — full width dedicated card */}
          {order.code_suivi && (
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
                        <path d="m7.5 4.27 9 5.15" />
                        <polyline points="3.29 7 12 12 20.71 7" />
                        <line x1="12" y1="22" x2="12" y2="12" />
                        <circle cx="18.5" cy="15.5" r="2.5" />
                        <path d="M20.27 17.27 22 19" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">{t("code_suivi")}</p>
                      <p className="font-mono font-bold text-base tracking-widest text-blue-700 dark:text-blue-300 break-all">
                        {order.code_suivi}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.code_suivi!)
                      toast.success("Tracking code copied!")
                    }}
                    className="shrink-0 flex items-center gap-1.5 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copy
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IconPackage className="size-4" />
                {t("items")} ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="ps-4">{t("product")}</TableHead>
                    <TableHead>{t("variation")}</TableHead>
                    <TableHead className="text-center">{t("qty")}</TableHead>
                    <TableHead className="text-end">{t("unitPrice")}</TableHead>
                    <TableHead className="text-end pe-4">{t("lineTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="ps-4">
                        <div className="flex items-center gap-3">
                          {item.product_variations?.products?.thumbnail_url ? (
                            <Image
                              src={item.product_variations.products.thumbnail_url}
                              alt={item.product_variations.products.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {item.product_variations?.products?.name ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.product_variations?.color && (
                            <Badge variant="outline" className="text-xs">
                              {item.product_variations.color}
                            </Badge>
                          )}
                          {item.product_variations?.size && (
                            <Badge variant="outline" className="text-xs">
                              {item.product_variations.size}
                            </Badge>
                          )}
                          {item.product_variations?.sku && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.product_variations.sku}
                            </span>
                          )}
                          {!item.product_variations?.color && !item.product_variations?.size && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-end">
                        {item.unit_price.toFixed(2)} DH
                      </TableCell>
                      <TableCell className="text-end pe-4 font-medium">
                        {(item.quantity * item.unit_price).toFixed(2)} DH
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{t("total")}</span>
                <span className="text-lg font-semibold">
                  {order.total_amount.toFixed(2)} DH
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Activity timeline & Tracking */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Tracking / Ads Data */}
          {(order.utm_source || order.utm_medium || order.utm_campaign || order.click_id || order.referrer) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconDeviceDesktopAnalytics className="size-4" />
                  Ads & Tracability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {order.utm_source && (
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Source</div>
                      <div className="font-medium">{order.utm_source}</div>
                    </div>
                  )}
                  {order.utm_medium && (
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Medium</div>
                      <div className="font-medium">{order.utm_medium}</div>
                    </div>
                  )}
                  {order.utm_campaign && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Campaign</div>
                      <div className="font-medium">{order.utm_campaign}</div>
                    </div>
                  )}
                  {order.click_id && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Click ID</div>
                      <div className="font-medium font-mono text-xs break-all">{order.click_id}</div>
                    </div>
                  )}
                  {order.referrer && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Referrer</div>
                      <div className="font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={order.referrer}>
                        <a href={order.referrer} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {order.referrer}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IconClock className="size-4" />
                {t("activityLog")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-0 px-4 pb-4">
                  {activity.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("noActivity")}
                    </p>
                  ) : (
                    activity.map((entry, idx) => (
                      <div key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
                        {/* Timeline line */}
                        {idx < activity.length - 1 && (
                          <div className="absolute start-[7px] top-5 bottom-0 w-px bg-border" />
                        )}
                        {/* Dot */}
                        <div className="mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-primary bg-background" />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {entry.action === "status_changed"
                              ? t("statusChanged", {
                                from: t(entry.old_value ?? "pending"),
                                to: t(entry.new_value ?? "pending"),
                              })
                              : entry.action === "created"
                                ? t("orderCreated")
                                : entry.action}
                          </p>
                          {entry.note && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {entry.note}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {entry.user_name && <span>{entry.user_name}</span>}
                            {entry.user_name && <span>·</span>}
                            <span>
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status update dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("updateOrderStatus")}</DialogTitle>
            <DialogDescription>
              {t("changeStatus", { orderNumber: order.order_number })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("orderStatus")}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("pending")}</SelectItem>
                  <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
                  <SelectItem value="call_1">{t("call_1")}</SelectItem>
                  <SelectItem value="call_2">{t("call_2")}</SelectItem>
                  <SelectItem value="call_3">{t("call_3")}</SelectItem>
                  <SelectItem value="call_whatsapp">{t("call_whatsapp")}</SelectItem>
                  <SelectItem value="call_sms">{t("call_sms")}</SelectItem>
                  <SelectItem value="no_response">{t("no_response")}</SelectItem>
                  <SelectItem value="postponed">{t("postponed")}</SelectItem>
                  <SelectItem value="unreachable">{t("unreachable")}</SelectItem>
                  <SelectItem value="voicemail">{t("voicemail")}</SelectItem>
                  <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                  <SelectItem value="not_serious">{t("not_serious")}</SelectItem>
                  <SelectItem value="fake_order">{t("fake_order")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("delivery_status")}</Label>
              <Select value={newDeliveryStatus} onValueChange={setNewDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="livre">{t("livre")}</SelectItem>
                  <SelectItem value="envois_recu">{t("envois_recu")}</SelectItem>
                  <SelectItem value="refuse">{t("refuse")}</SelectItem>
                  <SelectItem value="annule">{t("annule")}</SelectItem>
                  <SelectItem value="retourne">{t("retourne")}</SelectItem>
                  <SelectItem value="stope">{t("stope")}</SelectItem>
                  <SelectItem value="suivi">{t("suivi")}</SelectItem>
                  <SelectItem value="retour_stock">{t("retour_stock")}</SelectItem>
                  <SelectItem value="pr">{t("pr")}</SelectItem>
                  <SelectItem value="an_1">{t("an_1")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("payment_status")}</Label>
              <Select value={newConfirmationStatus} onValueChange={setNewConfirmationStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">{t("paid")}</SelectItem>
                  <SelectItem value="return">{t("return")}</SelectItem>
                  <SelectItem value="refund">{t("refund")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canUpdateOrder && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {usersData.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("code_suivi")}</Label>
              <Input
                placeholder="e.g. 1234567890"
                value={newCodeSuivi}
                onChange={(e) => setNewCodeSuivi(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("activityNote")}</Label>
              <Textarea
                placeholder={t("activityNotePlaceholder")}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating && <Spinner className="mr-2 size-4" />}
              {t("updateStatus")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order "#{order?.order_number}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={updating}
              onClick={async () => {
                setUpdating(true)
                const res = await fetch(`/api/orders/${id}`, { method: "DELETE" })
                setUpdating(false)
                if (res.ok) {
                  toast.success(tc("deleteSuccess") || tc("delete") + " OK")
                  setDeleteDialogOpen(false)
                  router.push("/dashboard/orders")
                }
              }}
            >
              {updating && <Spinner className="mr-2 size-4" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
