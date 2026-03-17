"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
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
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  total_amount: number
  notes: string | null
  created_at: string
  items_count: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
}

function OrderStatusForm({
  order,
  onSave,
  onCancel,
}: {
  order: Order
  onSave: (status: string) => void
  onCancel: () => void
}) {
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const [status, setStatus] = React.useState(order.status)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(status)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">{t("orderStatus")}</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Order["status"])}>
          <SelectTrigger id="status">
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{tc("cancel")}</Button>
        <Button type="submit">{t("updateStatus")}</Button>
      </DialogFooter>
    </form>
  )
}

export default function OrdersPage() {
  const { hasPermission } = usePermissions()
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const { data: orders = [], mutate, isLoading } = useSWR<Order[]>("/api/orders", fetcher)
  
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null)
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleUpdateStatus = async (status: string) => {
    if (!editingOrder) return
    await fetch(`/api/orders/${editingOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    mutate()
    setEditingOrder(null)
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
      accessorKey: "total_amount",
      header: t("total"),
      cell: ({ row }) => (
        <span className="font-medium">${row.original.total_amount.toFixed(2)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={statusColors[row.original.status]}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
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
            <DropdownMenuItem onClick={() => setViewingOrder(row.original)}>
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
              <DialogDescription>{t("changeStatus", { orderNumber: editingOrder?.order_number })}</DialogDescription>
            </DialogHeader>
            {editingOrder && <OrderStatusForm order={editingOrder} onSave={handleUpdateStatus} onCancel={() => setEditingOrder(null)} />}
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("orderDetails")}</DialogTitle>
              <DialogDescription>{t("order")} {viewingOrder?.order_number}</DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("customer")}</Label>
                    <p className="font-medium">{viewingOrder.full_name}</p>
                    {viewingOrder.email && <p className="text-sm text-muted-foreground">{viewingOrder.email}</p>}
                    {viewingOrder.phone && <p className="text-sm text-muted-foreground">{viewingOrder.phone}</p>}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{tc("status")}</Label>
                    <div className="mt-1">
                      <Badge variant={statusColors[viewingOrder.status]}>
                        {viewingOrder.status.charAt(0).toUpperCase() + viewingOrder.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("shipping")}</Label>
                    <p className="font-medium">{viewingOrder.city}</p>
                    <p className="text-sm text-muted-foreground">{viewingOrder.address}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("total")}</Label>
                    <p className="text-lg font-semibold">${viewingOrder.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{tc("date")}</Label>
                    <p>{new Date(viewingOrder.created_at).toLocaleString()}</p>
                  </div>
                  {viewingOrder.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t("notes")}</Label>
                      <p className="text-sm">{viewingOrder.notes}</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewingOrder(null)}>{tc("close")}</Button>
                  <Button onClick={() => { setViewingOrder(null); setEditingOrder(viewingOrder); }}>{t("updateStatus")}</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
}
