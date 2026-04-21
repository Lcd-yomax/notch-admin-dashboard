"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconLayoutColumns,
  IconTrash,
  IconDownload,
  IconCalendar,
  IconFilter,
  IconX,
  IconPlus,
} from "@tabler/icons-react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import useSWR from "swr"
import { TableSpinner } from "@/components/ui/spinner"

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { usePermissions } from "@/hooks/use-permissions"

interface Order {
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
  items_count: number
  assigned_to: string | null
  assignee_name: string | null
  delivery_status: string | null
  confirmation_status: string | null
  code_suivi: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  fake_order: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  exported: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
}

const deliveryStatusClasses: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
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
}

function CodeSuiviCell({
  orderId,
  code,
  canEdit,
  onSave,
}: {
  orderId: string
  code: string | null
  canEdit: boolean
  onSave: (orderId: string, newCode: string) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(code || "")
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => { setDraft(code || "") }, [code])
  React.useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = async () => {
    if (draft === (code || "")) { setEditing(false); return }
    setSaving(true)
    await onSave(orderId, draft)
    setSaving(false)
    setEditing(false)
  }

  if (editing && canEdit) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") { setDraft(code || ""); setEditing(false) }
          }}
          placeholder="Code suivi..."
          className="h-7 w-[164px] rounded border border-input bg-background px-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring uppercase"
        />
        {saving && (
          <svg className="animate-spin size-3 text-muted-foreground shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 max-w-[180px] group"
      onClick={() => canEdit && setEditing(true)}
    >
      {code ? (
        <>
          <span
            className={`font-mono text-xs font-semibold tracking-wide truncate ${
              canEdit ? "cursor-pointer hover:text-primary" : ""
            }`}
            title={`${code}${canEdit ? " — click to edit" : ""}`}
          >
            {code}
          </span>
          <button
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(code)
            }}
            title="Copy"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </button>
        </>
      ) : canEdit ? (
        <span className="text-xs text-muted-foreground/50 italic cursor-pointer hover:text-muted-foreground transition-colors">
          + Add code
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  )
}

function OrderStatusForm({
  order,
  users,
  canAssign,
  onSave,
  onCancel,
}: {
  order: Order
  users: any[]
  canAssign: boolean
  onSave: (status: string, assignee: string | null) => void
  onCancel: () => void
}) {
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const [status, setStatus] = React.useState(order.status)
  const [assignee, setAssignee] = React.useState(order.assigned_to || "none")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(status, assignee === "none" ? null : assignee)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">{t("orderStatus")}</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
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
            <SelectItem value="exported">{t("exported") || "Exported"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {canAssign && (
        <div className="space-y-2">
          <Label htmlFor="assignee">Assign To</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger id="assignee">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{tc("cancel")}</Button>
        <Button type="submit">{t("updateStatus")}</Button>
      </DialogFooter>
    </form>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, hasPermission } = usePermissions()
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const { data: orders = [], mutate, isLoading } = useSWR<Order[]>("/api/orders", fetcher)
  const { data: usersData = [] } = useSWR<any[]>("/api/users", fetcher)
  
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  
  // Custom Filters State
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [deliveryStatusFilter, setDeliveryStatusFilter] = React.useState<string>("all")
  const [confirmationStatusFilter, setConfirmationStatusFilter] = React.useState<string>("all")
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [isExporting, setIsExporting] = React.useState(false)

  const canUpdateOrder = React.useCallback((order: Order) => {
    return hasPermission("orders:update_status") || 
           (hasPermission("orders:update_own") && order.assigned_to === user?.id)
  }, [hasPermission, user?.id])

  const handleUpdateStatus = async (status: string, assignee: string | null) => {
    if (!editingOrder) return
    await fetch(`/api/orders/${editingOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, user_id: user?.id, assigned_to: assignee }),
    })
    mutate()
    toast.success(t("statusUpdateSuccess"))
    setEditingOrder(null)
  }

  const handleAssigneeChange = async (orderId: string, assignee: string, currentStatus: string) => {
    const assigned_to = assignee === "none" ? null : assignee
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: currentStatus, assigned_to, user_id: user?.id }),
    })
    mutate()
    toast.success("Assignee updated")
  }

  const handleStatusChangeInline = async (orderId: string, newStatus: string, currentAssignee: string | null) => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, assigned_to: currentAssignee, user_id: user?.id }),
    })
    mutate()
    toast.success(t("statusUpdateSuccess"))
  }

  const handleConfirmationStatusChangeInline = async (orderId: string, newStatus: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation_status: newStatus, user_id: user?.id }),
    })
    mutate()
    toast.success(t("statusUpdateSuccess"))
  }

  const handleDeliveryStatusChangeInline = async (orderId: string, newDeliveryStatus: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_status: newDeliveryStatus, user_id: user?.id }),
    })
    mutate()
  }

  const handleCodeSuiviUpdate = async (orderId: string, newCode: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code_suivi: newCode || null, user_id: user?.id }),
    })
    mutate()
    toast.success("Code suivi updated")
  }

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return
    const res = await fetch(`/api/orders/${deletingOrder.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success(tc("deleteSuccess") || tc("delete") + " OK")
      mutate()
    }
    setDeletingOrder(null)
  }

  const columns: ColumnDef<Order>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "order_number",
      header: t("order"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.order_number}</span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: t("customer"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          {row.original.email && <div className="text-xs text-muted-foreground">{row.original.email}</div>}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: tc("phone") || "Phone",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.phone || "-"}</span>
      ),
    },
    {
      accessorKey: "code_suivi",
      header: t("code_suivi"),
      cell: ({ row }) => (
        <CodeSuiviCell
          orderId={row.original.id}
          code={row.original.code_suivi}
          canEdit={canUpdateOrder(row.original)}
          onSave={handleCodeSuiviUpdate}
        />
      ),
    },
    {
      accessorKey: "items_count",
      header: t("items"),
      cell: ({ row }) => <span>{row.original.items_count} items</span>,
    },
    {
      accessorKey: "assignee_name",
      header: "Assignee",
      cell: ({ row }) => (
        canUpdateOrder(row.original) ? (
          <Select 
            value={row.original.assigned_to || "none"}
            onValueChange={(val) => handleAssigneeChange(row.original.id, val, row.original.status)}
          >
            <SelectTrigger className="h-8 text-xs bg-transparent border-dashed w-[130px]">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {usersData.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm font-medium">{row.original.assignee_name || "—"}</span>
        )
      ),
    },
    {
      accessorKey: "total_amount",
      header: t("total"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.total_amount.toFixed(2)} DH</span>
      ),
    },
    {
      accessorKey: "status",
      header: t("confirmation_status"),
      cell: ({ row }) => (
        canUpdateOrder(row.original) ? (
          <Select 
            value={row.original.status}
            onValueChange={(val) => handleStatusChangeInline(row.original.id, val, row.original.assigned_to)}
          >
            <SelectTrigger className={`h-8 font-medium text-xs w-[140px] focus:ring-0 ${statusClasses[row.original.status]} border-none shadow-none`}>
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
              <SelectItem value="exported">{t("exported") || "Exported"}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={statusClasses[row.original.status]}>
            {t(row.original.status)}
          </Badge>
        )
      ),
    },
    {
      accessorKey: "delivery_status",
      header: t("delivery_status"),
      cell: ({ row }) => (
        canUpdateOrder(row.original) ? (
          <Select 
            value={row.original.delivery_status || "pending"}
            onValueChange={(val) => handleDeliveryStatusChangeInline(row.original.id, val)}
          >
            <SelectTrigger className={`h-8 font-medium text-xs w-[140px] focus:ring-0 ${deliveryStatusClasses[row.original.delivery_status || "pending"] || ""} border-none shadow-none`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente / Pending</SelectItem>
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
        ) : (
          <Badge variant="outline" className={deliveryStatusClasses[row.original.delivery_status || "pending"]}>
            {row.original.delivery_status && row.original.delivery_status !== "pending" ? t(row.original.delivery_status) : "Pending"}
          </Badge>
        )
      ),
    },
    {
      accessorKey: "confirmation_status",
      header: t("payment_status"),
      cell: ({ row }) => (
        canUpdateOrder(row.original) ? (
          <Select 
            value={row.original.confirmation_status || "pending"}
            onValueChange={(val) => handleConfirmationStatusChangeInline(row.original.id, val)}
          >
            <SelectTrigger className={`h-8 font-medium text-xs w-[140px] focus:ring-0 ${confirmationStatusClasses[row.original.confirmation_status || "pending"] || ""} border-none shadow-none`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">{t("paid")}</SelectItem>
              <SelectItem value="return">{t("return")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={confirmationStatusClasses[row.original.confirmation_status || "pending"]}>
            {row.original.confirmation_status && row.original.confirmation_status !== "pending" ? t(row.original.confirmation_status) : "Pending"}
          </Badge>
        )
      ),
    },
    {
      accessorKey: "created_at",
      header: tc("date"),
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 text-muted-foreground" size="icon">
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${row.original.id}`)}>
              <IconEye className="mr-2 size-4" />
              {t("viewDetails")}
            </DropdownMenuItem>
            {canUpdateOrder(row.original) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditingOrder(row.original)}>
                  <IconEdit className="mr-2 size-4" />
                  {t("updateStatus")}
                </DropdownMenuItem>
              </>
            )}
            {canUpdateOrder(row.original) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${row.original.id}/edit`)}>
                  <IconEdit className="mr-2 size-4" />
                  Edit Order
                </DropdownMenuItem>
              </>
            )}
            {hasPermission("orders:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeletingOrder(row.original)} className="text-destructive focus:text-destructive">
                  <IconTrash className="mr-2 size-4" />
                  {tc("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Apply custom filters outside of react-table to simplify combining global + specific filters
  const filteredOrders = React.useMemo(() => {
    let filtered = [...orders]
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    if (deliveryStatusFilter !== "all") {
      filtered = filtered.filter(o => o.delivery_status === deliveryStatusFilter)
    }
    if (confirmationStatusFilter !== "all") {
      filtered = filtered.filter(o => o.confirmation_status === confirmationStatusFilter)
    }
    if (dateRange.from) {
      filtered = filtered.filter(o => new Date(o.created_at) >= dateRange.from!)
    }
    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter(o => new Date(o.created_at) <= endOfDay)
    }
    
    return filtered
  }, [orders, statusFilter, deliveryStatusFilter, confirmationStatusFilter, dateRange])

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const o = row.original
      return [
        o.order_number, o.full_name, o.email, o.phone,
        o.city, o.address, o.status, o.notes, o.code_suivi,
      ].some((v) => v && String(v).toLowerCase().includes(q))
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleExportSelected = async () => {
    setIsExporting(true)
    const hasSelection = Object.keys(rowSelection).length > 0
    let selectedOrders: Order[] = []

    if (hasSelection) {
      selectedOrders = orders.filter(o => (rowSelection as Record<string, boolean>)[o.id])
    } else {
      selectedOrders = table.getFilteredRowModel().rows.map(row => row.original)
    }

    if (!selectedOrders.length) {
      toast.error("No orders to export")
      setIsExporting(false)
      return
    }

    const headers = ["Order Number", "Date", "Customer", "Phone", "City", "Total Amount", "Items Count", "Status"]
    const csvContent = [
      headers.join(","),
      ...selectedOrders.map(o => [
        o.order_number,
        new Date(o.created_at).toLocaleDateString(),
        `"${o.full_name}"`,
        `"${o.phone || ''}"`,
        `"${o.city}"`,
        o.total_amount,
        o.items_count,
        o.status
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    try {
      await Promise.all(selectedOrders.map(o => 
        fetch(`/api/orders/${o.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "exported", user_id: user?.id })
        })
      ))
      toast.success(`${selectedOrders.length} orders exported.`)
      setRowSelection({})
      mutate()
    } catch (err) {
      toast.error("Failed to update status")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      >
              <Button asChild className="mr-2">
                <Link href="/dashboard/orders/new">
                  <IconPlus className="size-4 mr-2" />
                  {/* Reuse some translation or hardcode "Create Order" for now */}
                  Create Order
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <IconLayoutColumns />
                    {tc("columns")}
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table.getAllColumns().filter((col) => col.getCanHide()).map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
      </PageHeader>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-lg border">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Input
                placeholder={t("searchOrders")}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-xs"
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 border-dashed">
                    <IconFilter className="mr-2 size-4" />
                    Filters
                    {(statusFilter !== "all" || deliveryStatusFilter !== "all" || confirmationStatusFilter !== "all" || dateRange.from) && (
                      <Badge variant="secondary" className="ml-2 px-1 rounded-sm">On</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-4" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Custom Filters</h4>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => {
                        setStatusFilter("all")
                        setDeliveryStatusFilter("all")
                        setConfirmationStatusFilter("all")
                        setDateRange({ from: undefined, to: undefined })
                      }}>
                        Reset <IconX className="ml-1 size-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("orderStatus")}</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
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
                          <SelectItem value="fake_order">{t("fake_order")}</SelectItem>
                          <SelectItem value="exported">{t("exported")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("delivery_status")}</Label>
                      <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All Delivery" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
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
                      <Label className="text-xs">{t("payment_status")}</Label>
                      <Select value={confirmationStatusFilter} onValueChange={setConfirmationStatusFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All Confirmation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">{t("paid")}</SelectItem>
                          <SelectItem value="return">{t("return")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={`h-10 justify-start text-left font-normal border-dashed ${!dateRange.from && "text-muted-foreground"}`}>
                    <IconCalendar className="mr-2 size-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={handleExportSelected} 
              size="sm" 
              variant="outline" 
              className="h-10 whitespace-nowrap"
              disabled={isExporting || table.getFilteredRowModel().rows.length === 0}
            >
              <IconDownload className="mr-2 size-4" />
              {tc("export")} {Object.keys(rowSelection).length > 0 ? `(${Object.keys(rowSelection).length})` : ""}
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isLoading ? (
                  <TableSpinner colSpan={columns.length} />
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <div className="text-muted-foreground">{t("noOrders")}</div>
                        <div className="text-sm text-muted-foreground">
                          {t("noOrdersDescription")}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <IconChevronsLeft />
              </Button>
              <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <IconChevronLeft />
              </Button>
              <span className="text-sm">Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
              <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <IconChevronRight />
              </Button>
              <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <IconChevronsRight />
              </Button>
            </div>
          </div>

        <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("updateOrderStatus")}</DialogTitle>
              <DialogDescription>{t("changeStatus", { orderNumber: editingOrder?.order_number ?? "" })}</DialogDescription>
            </DialogHeader>
            {editingOrder && <OrderStatusForm order={editingOrder} users={usersData} canAssign={hasPermission("orders:update_status")} onSave={handleUpdateStatus} onCancel={() => setEditingOrder(null)} />}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete order "#{deletingOrder?.order_number}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingOrder(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDeleteOrder}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  )
}
