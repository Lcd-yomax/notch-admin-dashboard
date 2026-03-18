"use client"

import * as React from "react"
import Image from "next/image"
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
  IconNote,
} from "@tabler/icons-react"
import useSWR from "swr"

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
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  total_amount: number
  notes: string | null
  created_at: string
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
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
}

const statusButtonClasses: Record<string, string> = {
  pending: "bg-yellow-600 hover:bg-yellow-700 text-white",
  processing: "bg-blue-600 hover:bg-blue-700 text-white",
  shipped: "bg-indigo-600 hover:bg-indigo-700 text-white",
  delivered: "bg-green-600 hover:bg-green-700 text-white",
  cancelled: "bg-red-600 hover:bg-red-700 text-white",
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

  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState("")
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
        user_id: user?.id,
        note: statusNote || null,
      }),
    })
    setUpdating(false)
    setStatusDialogOpen(false)
    setStatusNote("")
    mutate()
    mutateActivity()
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
        <Button variant="outline" onClick={() => router.push("/dashboard/orders")}>
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/orders")}>
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
          <Badge variant="outline" className={`text-sm px-3 py-1 ${statusClasses[order.status]}`}>
            {t(order.status)}
          </Badge>
          {hasPermission("orders:update_status") && (
            <Button
              size="sm"
              className={statusButtonClasses[order.status]}
              onClick={() => {
                setNewStatus(order.status)
                setStatusDialogOpen(true)
              }}
            >
              <IconEdit className="mr-2 size-4" />
              {t("updateStatus")}
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

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconNote className="size-4" />
                  {t("notes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
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
                        ${item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end pe-4 font-medium">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{t("total")}</span>
                <span className="text-lg font-semibold">
                  ${order.total_amount.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Activity timeline */}
        <div className="lg:col-span-1">
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
                  <SelectItem value="processing">{t("processing")}</SelectItem>
                  <SelectItem value="shipped">{t("shipped")}</SelectItem>
                  <SelectItem value="delivered">{t("delivered")}</SelectItem>
                  <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  )
}
