"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TanTable,
  type VisibilityState,
} from "@tanstack/react-table"
import useSWR from "swr"
import { useTranslations } from "next-intl"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

type Product = {
  id: string
  name: string
  slug: string
  category_name: string | null
  thumbnail_url: string | null
  is_active: boolean
  variations_count: number
  created_at: string
}

type Order = {
  id: string
  order_number: string
  full_name: string
  email: string
  phone: string
  city: string
  status: string
  total_amount: number
  items_count: number
  created_at: string
}

type Category = {
  id: string
  name: string
  slug: string
  image_url: string | null
  products_count: number
  created_at: string
}

type Review = {
  id: string
  full_name: string
  email: string
  stars: number
  comment: string
  image_url: string | null
  is_approved: boolean
  product_name: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

const orderStatusClasses: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  call_1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  call_2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  call_3: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  call_whatsapp: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  call_sms: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  no_response: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
  postponed: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  unreachable: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  voicemail: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  not_serious: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300",
  fake_order: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300",
}

function useGenericTable<T>(data: T[], columns: ColumnDef<T>[]) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  return useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row: any) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })
}

function GenericTableContent<T>({ table, columns, emptyMessage, emptyDescription, emptyAction, t }: {
  table: TanTable<T>
  columns: ColumnDef<T>[]
  emptyMessage: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
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
                    <div className="text-muted-foreground">{emptyMessage}</div>
                    {emptyDescription && <div className="text-sm text-muted-foreground">{emptyDescription}</div>}
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {t("rowsSelected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label className="text-sm font-medium">{t("rowsPerPage")}</Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            {t("pageOf", {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount() || 1,
            })}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DataTable() {
  const t = useTranslations("dataTable")
  const [activeTab, setActiveTab] = React.useState("products")

  // Fetch all data
  const { data: products } = useSWR<Product[]>("/api/products", fetcher)
  const { data: ordersRaw } = useSWR<Order[]>("/api/orders", fetcher)
  const { data: categoriesRaw } = useSWR<Category[]>("/api/categories", fetcher)
  const { data: reviewsRaw } = useSWR<Review[]>("/api/reviews", fetcher)

  const productsData = Array.isArray(products) ? products : []
  const ordersData = Array.isArray(ordersRaw) ? ordersRaw : []
  const categoriesData = Array.isArray(categoriesRaw) ? categoriesRaw : []
  const reviewsData = Array.isArray(reviewsRaw) ? reviewsRaw : []

  // Product columns
  const productColumns = React.useMemo<ColumnDef<Product>[]>(() => [
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
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: t("productName"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail_url ? (
            <img src={row.original.thumbnail_url} alt={row.original.name} className="size-10 rounded-md object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">{t("noImg")}</div>
          )}
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "category_name",
      header: t("category"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground">
          {row.original.category_name || t("uncategorized")}
        </Badge>
      ),
    },
    {
      accessorKey: "variations_count",
      header: t("variations"),
      cell: ({ row }) => <div className="text-center">{row.original.variations_count}</div>,
    },
    {
      accessorKey: "is_active",
      header: t("status"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? t("active") : t("inactive")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("created"),
      cell: ({ row }) => <div className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>{t("edit")}</DropdownMenuItem>
            <DropdownMenuItem>{t("viewDetails")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">{t("delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [t])

  // Order columns
  const orderColumns = React.useMemo<ColumnDef<Order>[]>(() => [
    {
      accessorKey: "order_number",
      header: t("orderNumber"),
      cell: ({ row }) => <div className="font-medium">#{row.original.order_number}</div>,
    },
    {
      accessorKey: "full_name",
      header: t("customer"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: t("city"),
    },
    {
      accessorKey: "items_count",
      header: t("items"),
      cell: ({ row }) => <div className="text-center">{row.original.items_count}</div>,
    },
    {
      accessorKey: "total_amount",
      header: t("total"),
      cell: ({ row }) => <div className="font-medium">{row.original.total_amount?.toLocaleString()} DA</div>,
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => (
        <Badge variant="outline" className={orderStatusClasses[row.original.status] || ""}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("created"),
      cell: ({ row }) => <div className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
  ], [t])

  // Category columns
  const categoryColumns = React.useMemo<ColumnDef<Category>[]>(() => [
    {
      accessorKey: "name",
      header: t("categoryName"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.image_url ? (
            <img src={row.original.image_url} alt={row.original.name} className="size-10 rounded-md object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">{t("noImg")}</div>
          )}
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "products_count",
      header: t("productsCount"),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.products_count}</Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("created"),
      cell: ({ row }) => <div className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>{t("edit")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">{t("delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [t])

  // Review columns
  const reviewColumns = React.useMemo<ColumnDef<Review>[]>(() => [
    {
      accessorKey: "full_name",
      header: t("reviewer"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "product_name",
      header: t("productName"),
      cell: ({ row }) => <div>{row.original.product_name}</div>,
    },
    {
      accessorKey: "stars",
      header: t("rating"),
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) =>
            i < row.original.stars ? (
              <IconStarFilled key={i} className="size-4 text-yellow-500" />
            ) : (
              <IconStar key={i} className="size-4 text-muted-foreground/30" />
            )
          )}
        </div>
      ),
    },
    {
      accessorKey: "comment",
      header: t("comment"),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-sm text-muted-foreground">
          {row.original.comment}
        </div>
      ),
    },
    {
      accessorKey: "is_approved",
      header: t("status"),
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.is_approved
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        }>
          {row.original.is_approved ? t("approved") : t("pending")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("created"),
      cell: ({ row }) => <div className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
  ], [t])

  // Create table instances
  const productTable = useGenericTable(productsData, productColumns)
  const orderTable = useGenericTable(ordersData, orderColumns)
  const categoryTable = useGenericTable(categoriesData, categoryColumns)
  const reviewTable = useGenericTable(reviewsData, reviewColumns)

  // Get the active table for the column customizer
  const activeTable = activeTab === "products" ? productTable
    : activeTab === "orders" ? orderTable
    : activeTab === "categories" ? categoryTable
    : reviewTable

  return (
    <Tabs
      defaultValue="products"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder={t("selectView")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="products">{t("products")}</SelectItem>
            <SelectItem value="orders">{t("orders")}</SelectItem>
            <SelectItem value="categories">{t("categories")}</SelectItem>
            <SelectItem value="reviews">{t("reviews")}</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="products">
            {t("products")} <Badge variant="secondary">{productsData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="orders">
            {t("orders")} <Badge variant="secondary">{ordersData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="categories">
            {t("categories")} <Badge variant="secondary">{categoriesData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviews">
            {t("reviews")} <Badge variant="secondary">{reviewsData.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">{t("customizeColumns")}</span>
                <span className="lg:hidden">{t("columns")}</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {activeTable
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <TabsContent
        value="products"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <GenericTableContent
          table={productTable}
          columns={productColumns}
          emptyMessage={t("noProductsFound")}
          emptyDescription={t("addFirstProduct")}
          emptyAction={
            <Button size="sm" className="mt-2">
              <IconPlus className="size-4" />
              {t("addProduct")}
            </Button>
          }
          t={t}
        />
      </TabsContent>
      <TabsContent
        value="orders"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <GenericTableContent
          table={orderTable}
          columns={orderColumns}
          emptyMessage={t("noOrdersYet")}
          emptyDescription={t("ordersWillAppear")}
          t={t}
        />
      </TabsContent>
      <TabsContent
        value="categories"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <GenericTableContent
          table={categoryTable}
          columns={categoryColumns}
          emptyMessage={t("noCategoriesYet")}
          emptyDescription={t("createCategories")}
          emptyAction={
            <Button size="sm" className="mt-2">
              <IconPlus className="size-4" />
              {t("addCategory")}
            </Button>
          }
          t={t}
        />
      </TabsContent>
      <TabsContent
        value="reviews"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <GenericTableContent
          table={reviewTable}
          columns={reviewColumns}
          emptyMessage={t("noReviewsYet")}
          emptyDescription={t("reviewsWillAppear")}
          t={t}
        />
      </TabsContent>
    </Tabs>
  )
}
