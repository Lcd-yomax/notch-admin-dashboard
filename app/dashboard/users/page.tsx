"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
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
import { usePermissions } from "@/hooks/use-permissions"
import { useTranslations } from "next-intl"

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
  const t = useTranslations("users")
  const tc = useTranslations("common")
  const [email, setEmail] = React.useState(user?.email || "")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState(user?.full_name || "")
  const [roleId, setRoleId] = React.useState(user?.role_id || "")
  const [isActive, setIsActive] = React.useState(user?.is_active ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      email,
      ...(!user && { password }),
      full_name: fullName || null,
      role_id: roleId || null,
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")} *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          disabled={!!user}
        />
      </div>
      {!user && (
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")} *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            required
            minLength={6}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("fullNamePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{t("role")}</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role">
            <SelectValue placeholder={t("selectRole")} />
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
        <Label htmlFor="is_active">{tc("active")}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{tc("cancel")}</Button>
        <Button type="submit">{user ? t("updateUser") : t("createUser")}</Button>
      </DialogFooter>
    </form>
  )
}

export default function UsersPage() {
  const { hasPermission } = usePermissions()
  const t = useTranslations("users")
  const tc = useTranslations("common")
  const { data: users = [], mutate, isLoading } = useSWR<User[]>("/api/users", fetcher)
  const { data: roles = [] } = useSWR<Role[]>("/api/roles", fetcher)
  
  const searchParams = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null)

  React.useEffect(() => {
    if (searchParams.get("create") === "true") setIsCreateOpen(true)
  }, [searchParams])
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
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
      header: t("user"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name || t("unnamed")}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "role_name",
      header: t("role"),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role_name || t("noRole")}</Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? tc("active") : tc("inactive")}
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
            {hasPermission("users:write") && (
              <DropdownMenuItem onClick={() => setEditingUser(row.original)}>
                <IconEdit className="mr-2 size-4" />
                {tc("edit")}
              </DropdownMenuItem>
            )}
            {hasPermission("users:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingUser(row.original)}
                  className="text-destructive focus:text-destructive"
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
    data: users,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const u = row.original
      return [
        u.full_name, u.email, u.role_name,
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
          {hasPermission("users:write") && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <IconPlus />
              {t("addUser")}
            </Button>
          )}
        </PageHeader>

          <div className="flex items-center gap-2">
            <Input
              placeholder={t("searchUsers")}
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
                        <div className="text-muted-foreground">{t("noUsers")}</div>
                        {hasPermission("users:write") && (
                          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                            <IconPlus className="size-4" />
                            {t("addUser")}
                          </Button>
                        )}
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
              <DialogTitle>{t("createUser")}</DialogTitle>
              <DialogDescription>{t("createUserDesc")}</DialogDescription>
            </DialogHeader>
            <UserForm roles={roles} onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("editUser")}</DialogTitle>
              <DialogDescription>{t("editUserDesc")}</DialogDescription>
            </DialogHeader>
            <UserForm user={editingUser} roles={roles} onSave={handleUpdate} onCancel={() => setEditingUser(null)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("deleteUser")}</DialogTitle>
              <DialogDescription>
                {t("deleteUserConfirm", { email: deletingUser?.email })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingUser(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
