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
} from "@tabler/icons-react"
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

function OrderStatusForm({
  order,
  users,
  isSuperAdmin,
  onSave,
  onCancel,
}: {
  order: Order
  users: any[]
  isSuperAdmin: boolean
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

      {isSuperAdmin && (
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
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [isExporting, setIsExporting] = React.useState(false)

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
      accessorKey: "items_count",
      header: t("items"),
      cell: ({ row }) => <span>{row.original.items_count} items</span>,
    },
    {
      accessorKey: "assignee_name",
      header: "Assignee",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.assignee_name || "—"}</span>
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
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses[row.original.status]}>
          {t(row.original.status)}
        </Badge>
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
            {hasPermission("orders:update_status") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditingOrder(row.original)}>
                  <IconEdit className="mr-2 size-4" />
                  {t("updateStatus")}
                </DropdownMenuItem>
              </>
            )}
            {user?.role === "super_admin" && (
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

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const o = row.original
      return [
        o.order_number, o.full_name, o.email, o.phone,
        o.city, o.address, o.status, o.notes,
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

          <div className="flex items-center gap-2">
            <Input
              placeholder={t("searchOrders")}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <Button 
              onClick={handleExportSelected} 
              size="sm" 
              variant="outline" 
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
            {editingOrder && <OrderStatusForm order={editingOrder} users={usersData} isSuperAdmin={user?.role === "super_admin"} onSave={handleUpdateStatus} onCancel={() => setEditingOrder(null)} />}
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
