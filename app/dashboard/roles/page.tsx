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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

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
  const [name, setName] = React.useState(role?.name || "")
  const [description, setDescription] = React.useState(role?.description || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, description: description || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter role name"
          required
          disabled={role?.is_system}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this role's responsibilities"
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={role?.is_system}>{role ? "Update" : "Create"} Role</Button>
      </DialogFooter>
    </form>
  )
}

export default function RolesPage() {
  const { data: roles = [], mutate } = useSWR<Role[]>("/api/roles", fetcher)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<Role | null>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleCreate = async (data: Partial<Role>) => {
    await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
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
    setEditingRole(null)
  }

  const handleDelete = async () => {
    if (!deletingRole) return
    await fetch(`/api/roles/${deletingRole.id}`, { method: "DELETE" })
    mutate()
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
      header: "Role",
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
      header: "Permissions",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.permissions_count} permissions</Badge>
      ),
    },
    {
      accessorKey: "is_system",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.is_system ? "default" : "outline"}>
          {row.original.is_system ? "System" : "Custom"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
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
            <DropdownMenuItem 
              onClick={() => setEditingRole(row.original)}
              disabled={row.original.is_system}
            >
              <IconEdit className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeletingRole(row.original)}
              className="text-destructive focus:text-destructive"
              disabled={row.original.is_system}
            >
              <IconTrash className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: roles,
    columns,
    state: { sorting, columnVisibility, rowSelection, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Roles & Permissions</h1>
              <p className="text-muted-foreground">Manage user roles and access levels</p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <IconLayoutColumns />
                    Columns
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
              <Button onClick={() => setIsCreateOpen(true)}>
                <IconPlus />
                Add Role
              </Button>
            </div>
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
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <div className="text-muted-foreground">No roles found</div>
                        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                          <IconPlus className="size-4" />
                          Add Role
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
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>Add a new role with custom permissions.</DialogDescription>
            </DialogHeader>
            <RoleForm onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>Update role information.</DialogDescription>
            </DialogHeader>
            <RoleForm role={editingRole} onSave={handleUpdate} onCancel={() => setEditingRole(null)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingRole?.name}"? Users with this role will lose access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingRole(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
