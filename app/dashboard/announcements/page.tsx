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
  IconEye,
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
import { Switch } from "@/components/ui/switch"
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

interface Announcement {
  id: string
  title: string
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
  created_by_name: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function AnnouncementForm({
  announcement,
  onSave,
  onCancel,
}: {
  announcement?: Announcement | null
  onSave: (data: Partial<Announcement>) => void
  onCancel: () => void
}) {
  const t = useTranslations("announcements")
  const tc = useTranslations("common")
  const [title, setTitle] = React.useState(announcement?.title || "")
  const [body, setBody] = React.useState(announcement?.body || "")
  const [ctaLabel, setCtaLabel] = React.useState(announcement?.cta_label || "")
  const [ctaUrl, setCtaUrl] = React.useState(announcement?.cta_url || "")
  const [isActive, setIsActive] = React.useState(announcement?.is_active ?? true)
  const [startsAt, setStartsAt] = React.useState(announcement?.starts_at ? announcement.starts_at.slice(0, 16) : "")
  const [endsAt, setEndsAt] = React.useState(announcement?.ends_at ? announcement.ends_at.slice(0, 16) : "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title,
      body,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("announcementTitle")} *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("enterTitle")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">{t("body")}</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("enterBody")}
          rows={5}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cta_label">{t("ctaLabel")}</Label>
          <Input
            id="cta_label"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder={t("enterCtaLabel")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cta_url">{t("ctaUrl")}</Label>
          <Input
            id="cta_url"
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">{t("startsAt")} *</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">{t("endsAt")} *</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="is_active">{t("activeVisible")}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{tc("cancel")}</Button>
        <Button type="submit">{announcement ? t("updateAnnouncement") : t("createAnnouncement")}</Button>
      </DialogFooter>
    </form>
  )
}

export default function AnnouncementsPage() {
  const { hasPermission } = usePermissions()
  const t = useTranslations("announcements")
  const tc = useTranslations("common")
  const { data: announcements = [], mutate, isLoading } = useSWR<Announcement[]>("/api/announcements", fetcher)
  
  const searchParams = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null)
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<Announcement | null>(null)
  const [deletingAnnouncement, setDeletingAnnouncement] = React.useState<Announcement | null>(null)

  React.useEffect(() => {
    if (searchParams.get("create") === "true") setIsCreateOpen(true)
  }, [searchParams])
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleCreate = async (data: Partial<Announcement>) => {
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    setIsCreateOpen(false)
  }

  const handleUpdate = async (data: Partial<Announcement>) => {
    if (!editingAnnouncement) return
    await fetch(`/api/announcements/${editingAnnouncement.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    mutate()
    setEditingAnnouncement(null)
  }

  const handleDelete = async () => {
    if (!deletingAnnouncement) return
    await fetch(`/api/announcements/${deletingAnnouncement.id}`, { method: "DELETE" })
    mutate()
    setDeletingAnnouncement(null)
  }

  const columns: ColumnDef<Announcement>[] = [
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
      accessorKey: "title",
      header: t("announcementTitle"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {row.original.body}
          </div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "created_by_name",
      header: t("createdBy"),
      cell: ({ row }) => row.original.created_by_name || t("unknown"),
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
            <DropdownMenuItem onClick={() => setViewingAnnouncement(row.original)}>
              <IconEye className="mr-2 size-4" />
              {tc("view")}
            </DropdownMenuItem>
            {hasPermission("announcements:write") && (
              <DropdownMenuItem onClick={() => setEditingAnnouncement(row.original)}>
                <IconEdit className="mr-2 size-4" />
                {tc("edit")}
              </DropdownMenuItem>
            )}
            {hasPermission("announcements:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingAnnouncement(row.original)}
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
    data: announcements,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const a = row.original
      return [
        a.title, a.body, a.cta_label, a.created_by_name,
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
          {hasPermission("announcements:write") && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <IconPlus />
              {t("addAnnouncement")}
            </Button>
          )}
        </PageHeader>

          <div className="flex items-center gap-2">
            <Input
              placeholder={t("searchAnnouncements")}
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
                        <div className="text-muted-foreground">{t("noAnnouncements")}</div>
                        {hasPermission("announcements:write") && (
                          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                            <IconPlus className="size-4" />
                            {t("addAnnouncementEmpty")}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createAnnouncement")}</DialogTitle>
              <DialogDescription>{t("createAnnouncementDesc")}</DialogDescription>
            </DialogHeader>
            <AnnouncementForm onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("editAnnouncement")}</DialogTitle>
              <DialogDescription>{t("editAnnouncementDesc")}</DialogDescription>
            </DialogHeader>
            <AnnouncementForm announcement={editingAnnouncement} onSave={handleUpdate} onCancel={() => setEditingAnnouncement(null)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingAnnouncement} onOpenChange={() => setViewingAnnouncement(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewingAnnouncement?.title}</DialogTitle>
              <DialogDescription>
                Created on {viewingAnnouncement && new Date(viewingAnnouncement.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="whitespace-pre-wrap">{viewingAnnouncement?.body}</div>
              <div className="flex items-center gap-2">
                <Badge variant={viewingAnnouncement?.is_active ? "default" : "secondary"}>
                  {viewingAnnouncement?.is_active ? tc("active") : tc("inactive")}
                </Badge>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingAnnouncement(null)}>{tc("close")}</Button>
                {hasPermission("announcements:write") && (
                  <Button onClick={() => { setViewingAnnouncement(null); setEditingAnnouncement(viewingAnnouncement); }}>{tc("edit")}</Button>
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingAnnouncement} onOpenChange={() => setDeletingAnnouncement(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("deleteAnnouncement")}</DialogTitle>
              <DialogDescription>
                {t("deleteAnnouncementConfirm", { title: deletingAnnouncement?.title })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingAnnouncement(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
