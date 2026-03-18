"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconEdit,
  IconLayoutColumns,
  IconPlus,
  IconShield,
  IconTrash,
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
import { toast } from "sonner"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { usePermissions } from "@/hooks/use-permissions"
import { useTranslations } from "next-intl"

interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions_count: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function RoleForm({
  role,
  onSave,
  onCancel,
}: {
  role?: Role | null
  onSave: (data: Partial<Role>) => void
  onCancel: () => void
}) {
  const t = useTranslations("roles")
  const tc = useTranslations("common")
  const [name, setName] = React.useState(role?.name || "")
  const [description, setDescription] = React.useState(role?.description || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, description: description || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("roleName")} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("enterRoleName")}
          required
          disabled={role?.is_system}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("roleDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("describeRole")}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{tc("cancel")}</Button>
        <Button type="submit" disabled={role?.is_system}>{role ? t("updateRole") : t("createRole")}</Button>
      </DialogFooter>
    </form>
  )
}

export default function RolesPage() {
  const { hasPermission } = usePermissions()
  const t = useTranslations("roles")
  const tc = useTranslations("common")
  const { data: roles = [], mutate, isLoading } = useSWR<Role[]>("/api/roles", fetcher)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<Role | null>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleCreate = async (data: Partial<Role>) => {
    await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    toast.success(t("createSuccess"))
    setIsCreateOpen(false)
  }

  const handleUpdate = async (data: Partial<Role>) => {
    if (!editingRole) return
    await fetch(`/api/roles/${editingRole.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    toast.success(t("updateSuccess"))
    setEditingRole(null)
  }

  const handleDelete = async () => {
    if (!deletingRole) return
    await fetch(`/api/roles/${deletingRole.id}`, { method: "DELETE" })
    mutate()
    toast.success(t("deleteSuccess"))
    setDeletingRole(null)
  }

  const columns: ColumnDef<Role>[] = [
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
      accessorKey: "name",
      header: t("roleName"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconShield className="size-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.description && (
              <div className="text-xs text-muted-foreground max-w-xs truncate">
                {row.original.description}
              </div>
            )}
          </div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "permissions_count",
      header: t("permissions"),
      cell: ({ row }) => (
        <Badge variant="secondary">{t("permissionsCount", { count: row.original.permissions_count })}</Badge>
      ),
    },
    {
      accessorKey: "is_system",
      header: t("type"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_system ? "default" : "outline"}>
          {row.original.is_system ? t("system") : t("custom")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: tc("created"),
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
          <DropdownMenuContent align="end" className="w-32">
            {hasPermission("roles:manage") && (
              <DropdownMenuItem 
                onClick={() => setEditingRole(row.original)}
                disabled={row.original.is_system}
              >
                <IconEdit className="mr-2 size-4" />
                {tc("edit")}
              </DropdownMenuItem>
            )}
            {hasPermission("roles:manage") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingRole(row.original)}
                  className="text-destructive focus:text-destructive"
                  disabled={row.original.is_system}
                >
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
    data: roles,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const r = row.original
      return [
        r.name, r.description,
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
          placeholder={t("searchRoles")}
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
                    <div className="text-muted-foreground">{t("noRoles")}</div>
                    <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                      <IconPlus className="size-4" />
                      {t("addRole")}
                    </Button>
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("createRole")}</DialogTitle>
              <DialogDescription>{t("createRoleDesc")}</DialogDescription>
            </DialogHeader>
            <RoleForm onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("editRole")}</DialogTitle>
              <DialogDescription>{t("editRoleDesc")}</DialogDescription>
            </DialogHeader>
            <RoleForm role={editingRole} onSave={handleUpdate} onCancel={() => setEditingRole(null)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("deleteRole")}</DialogTitle>
              <DialogDescription>
                {t("deleteRoleConfirm", { name: deletingRole?.name ?? "" })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingRole(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
