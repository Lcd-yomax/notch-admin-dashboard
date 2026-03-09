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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"

interface User {
  id: string
  email: string
  full_name: string | null
  role_id: string | null
  role_name: string | null
  is_active: boolean
  created_at: string
}

interface Role {
  id: string
  name: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function UserForm({
  user,
  roles,
  onSave,
  onCancel,
}: {
  user?: User | null
  roles: Role[]
  onSave: (data: Partial<User>) => void
  onCancel: () => void
}) {
  const [email, setEmail] = React.useState(user?.email || "")
  const [fullName, setFullName] = React.useState(user?.full_name || "")
  const [roleId, setRoleId] = React.useState(user?.role_id || "")
  const [isActive, setIsActive] = React.useState(user?.is_active ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      email,
      full_name: fullName || null,
      role_id: roleId || null,
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          disabled={!!user}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="is_active">Active</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{user ? "Update" : "Create"} User</Button>
      </DialogFooter>
    </form>
  )
}

export default function UsersPage() {
  const { data: users = [], mutate } = useSWR<User[]>("/api/users", fetcher)
  const { data: roles = [] } = useSWR<Role[]>("/api/roles", fetcher)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleCreate = async (data: Partial<User>) => {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    setIsCreateOpen(false)
  }

  const handleUpdate = async (data: Partial<User>) => {
    if (!editingUser) return
    await fetch(`/api/users/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    setEditingUser(null)
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    await fetch(`/api/users/${deletingUser.id}`, { method: "DELETE" })
    mutate()
    setDeletingUser(null)
  }

  const columns: ColumnDef<User>[] = [
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
      accessorKey: "full_name",
      header: "User",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name || "Unnamed"}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "role_name",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role_name || "No Role"}</Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
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
            <DropdownMenuItem onClick={() => setEditingUser(row.original)}>
              <IconEdit className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeletingUser(row.original)}
              className="text-destructive focus:text-destructive"
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
    data: users,
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
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader
        title="Users"
        description="Manage admin users and their roles"
      >
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
            Add User
          </Button>
        </PageHeader>

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
                        <div className="text-muted-foreground">No admin users found</div>
                        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                          <IconPlus className="size-4" />
                          Add User
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
              <DialogTitle>Create Admin User</DialogTitle>
              <DialogDescription>Add a new admin user to the dashboard.</DialogDescription>
            </DialogHeader>
            <UserForm roles={roles} onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information.</DialogDescription>
            </DialogHeader>
            <UserForm user={editingUser} roles={roles} onSave={handleUpdate} onCancel={() => setEditingUser(null)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingUser?.email}"?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
