"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
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
} from "@tanstack/react-table"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner, TableSpinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { AccessDenied, Can } from "@/components/access"
import { BrandForm, type Brand } from "@/components/brands/brand-form"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

function BrandsPageContent() {
  const t = useTranslations("brands")
  const tc = useTranslations("common")
  const { data: brands = [], mutate, isLoading } = useSWR<Brand[]>("/api/brands", fetcher)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingBrand, setEditingBrand] = React.useState<Brand | null>(null)
  const [deletingBrand, setDeletingBrand] = React.useState<Brand | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleDelete = async () => {
    if (!deletingBrand) return
    // Checked on the server too, this only avoids a useless request
    if (deletingBrand.products_count > 0) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/brands/${deletingBrand.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || t("deleteError"))
        mutate()
        return
      }
      mutate()
      toast.success(t("deleteSuccess"))
      setDeletingBrand(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns: ColumnDef<Brand>[] = [
    {
      id: "logo",
      header: t("logo"),
      cell: ({ row }) =>
        row.original.logo_url ? (
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
            <img src={row.original.logo_url} alt={row.original.name} className="size-full object-contain" />
          </div>
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
        ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "slug",
      header: t("slug"),
      cell: ({ row }) => <div className="font-mono text-xs text-muted-foreground">{row.original.slug}</div>,
    },
    {
      accessorKey: "products_count",
      header: t("productsCount"),
      cell: ({ row }) => (
        <Badge variant="secondary">{t("productsCountValue", { count: row.original.products_count })}</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 text-muted-foreground" size="icon">
              <IconDotsVertical />
              <span className="sr-only">{tc("actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => setEditingBrand(row.original)}>
              <IconEdit className="mr-2 size-4" />
              {tc("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeletingBrand(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="mr-2 size-4" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: brands,
    columns,
    state: { sorting, globalFilter, pagination },
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      return [row.original.name, row.original.slug].some((v) => v && v.toLowerCase().includes(q))
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button onClick={() => setIsCreateOpen(true)}>
          <IconPlus />
          <span className="hidden sm:inline">{t("addBrand")}</span>
        </Button>
      </PageHeader>

      <Input
        placeholder={t("searchBrands")}
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border">
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
                <TableRow key={row.id}>
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
                    <div className="text-muted-foreground">{t("noBrands")}</div>
                    <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                      <IconPlus className="size-4" />
                      {t("addBrand")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <IconChevronLeft />
        </Button>
        <span className="text-sm">
          {t("pageOf", { current: pagination.pageIndex + 1, total: table.getPageCount() || 1 })}
        </span>
        <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <IconChevronRight />
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createBrand")}</DialogTitle>
            <DialogDescription>{t("createBrandDesc")}</DialogDescription>
          </DialogHeader>
          {isCreateOpen && (
            <BrandForm
              onSaved={() => {
                mutate()
                toast.success(t("createSuccess"))
                setIsCreateOpen(false)
              }}
              onCancel={() => setIsCreateOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBrand} onOpenChange={() => setEditingBrand(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("updateBrand")}</DialogTitle>
            <DialogDescription>{t("editBrandDesc")}</DialogDescription>
          </DialogHeader>
          {editingBrand && (
            <BrandForm
              key={editingBrand.id}
              brand={editingBrand}
              onSaved={() => {
                mutate()
                toast.success(t("updateSuccess"))
                setEditingBrand(null)
              }}
              onCancel={() => setEditingBrand(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingBrand} onOpenChange={() => setDeletingBrand(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteBrand")}</DialogTitle>
            <DialogDescription>
              {deletingBrand && deletingBrand.products_count > 0
                ? t("brandInUse", { count: deletingBrand.products_count })
                : t("deleteBrandConfirm", { name: deletingBrand?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBrand(null)}>{tc("cancel")}</Button>
            {deletingBrand && deletingBrand.products_count === 0 && (
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Spinner className="mr-1" />}
                {tc("delete")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BrandsPage() {
  return (
    <Can permission="brands.manage" fallback={<AccessDenied />}>
      <BrandsPageContent />
    </Can>
  )
}
