"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconEye,
  IconLayoutColumns,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUser,
  IconX,
  IconPlus,
  IconEdit,
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
import { PermissionButton } from "@/components/access"
import { useTranslations } from "next-intl"

interface Review {
  id: string
  product_id: string
  product_name: string
  full_name: string
  email: string
  stars: number
  comment: string | null
  image_url: string | null
  is_approved: boolean
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= stars ? (
          <IconStarFilled key={star} className="size-4 text-yellow-500" />
        ) : (
          <IconStar key={star} className="size-4 text-muted-foreground/30" />
        )
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const { hasPermission } = usePermissions()
  const t = useTranslations("reviews")
  const tc = useTranslations("common")
  const { data: reviews = [], mutate, isLoading } = useSWR<Review[]>("/api/reviews", fetcher)
  
  const [viewingReview, setViewingReview] = React.useState<Review | null>(null)
  const [deletingReview, setDeletingReview] = React.useState<Review | null>(null)

  const handleApprove = async (review: Review, approve: boolean) => {
    if (!hasPermission("reviews:approve")) return
    await fetch(`/api/reviews/${review.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_approved: approve }),
    })
    mutate()
    toast.success(approve ? t("approveSuccess") : t("rejectSuccess"))
    // Update the viewing dialog if open
    if (viewingReview?.id === review.id) {
      setViewingReview({ ...review, is_approved: approve })
    }
  }
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleDelete = async () => {
    if (!deletingReview || !hasPermission("reviews:delete")) return
    await fetch(`/api/reviews/${deletingReview.id}`, { method: "DELETE" })
    mutate()
    toast.success(t("deleteSuccess"))
    setDeletingReview(null)
  }

  const columns: ColumnDef<Review>[] = [
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
      accessorKey: "product_name",
      header: t("product"),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.product_name}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: t("customer"),
      cell: ({ row }) => (
        <div>
          <div>{row.original.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "stars",
      header: t("rating"),
      cell: ({ row }) => <StarRating stars={row.original.stars} />,
    },
    {
      accessorKey: "comment",
      header: t("comment"),
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-muted-foreground">
          {row.original.comment || t("noComment")}
        </div>
      ),
    },
    {
      accessorKey: "is_approved",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.is_approved
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
          }
        >
          {row.original.is_approved ? t("approved") : t("pending")}
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
            <DropdownMenuItem onClick={() => setViewingReview(row.original)}>
              <IconEye className="mr-2 size-4" />
              {tc("view")}
            </DropdownMenuItem>
            {hasPermission("reviews:approve") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/reviews/${row.original.id}/edit`} className="cursor-pointer">
                    <IconEdit className="mr-2 size-4" />
                    Edit Review
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            {hasPermission("reviews:approve") && (
              <>
                <DropdownMenuSeparator />
                {row.original.is_approved ? (
                  <DropdownMenuItem onClick={() => handleApprove(row.original, false)}>
                    <IconX className="mr-2 size-4" />
                    {t("reject")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleApprove(row.original, true)}>
                    <IconCheck className="mr-2 size-4" />
                    {t("approve")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            {hasPermission("reviews:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingReview(row.original)}
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
    data: reviews,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const r = row.original
      return [
        r.product_name, r.full_name, r.email, r.comment,
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
              <PermissionButton permission="reviews:approve" asChild className="mr-2">
                <Link href="/dashboard/reviews/new">
                  <IconPlus className="size-4 mr-2" />
                  Create Review
                </Link>
              </PermissionButton>
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
              placeholder={t("searchReviews")}
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
                        <div className="text-muted-foreground">{t("noReviews")}</div>
                        <div className="text-sm text-muted-foreground">
                          {t("reviewsWillAppear")}
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

        <Dialog open={!!viewingReview} onOpenChange={() => setViewingReview(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("reviewDetails")}</DialogTitle>
              <DialogDescription>{t("reviewFor", { productName: viewingReview?.product_name ?? "" })}</DialogDescription>
            </DialogHeader>
            {viewingReview && (
              <div className="flex flex-col gap-5">
                {/* Reviewer header */}
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconUser className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{viewingReview.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{viewingReview.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <StarRating stars={viewingReview.stars} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(viewingReview.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product & Status */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("product")}</p>
                    <p className="text-sm font-medium">{viewingReview.product_name}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={viewingReview.is_approved
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                    }
                  >
                    {viewingReview.is_approved ? t("approved") : t("pending")}
                  </Badge>
                </div>

                {/* Comment */}
                {viewingReview.comment ? (
                  <div className="rounded-lg border-s-4 border-primary/30 bg-muted/30 px-4 py-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingReview.comment}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t("noCommentProvided")}</p>
                )}

                {/* Review image */}
                {viewingReview.image_url && (
                  <div className="overflow-hidden rounded-xl">
                    <img
                      src={viewingReview.image_url}
                      alt="Review"
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                )}

                {/* Actions */}
                <DialogFooter className="gap-2">
                  {hasPermission("reviews:approve") && (
                    viewingReview.is_approved ? (
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleApprove(viewingReview, false)}
                      >
                        <IconX className="mr-2 size-4" />
                        {t("reject")}
                      </Button>
                    ) : (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(viewingReview, true)}
                      >
                        <IconCheck className="mr-2 size-4" />
                        {t("approve")}
                      </Button>
                    )
                  )}
                  <Button variant="outline" onClick={() => setViewingReview(null)}>{tc("close")}</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingReview} onOpenChange={() => setDeletingReview(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("deleteReview")}</DialogTitle>
              <DialogDescription>
                {t("deleteReviewConfirm", { name: deletingReview?.full_name ?? "" })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingReview(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
