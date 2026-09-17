"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
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
  IconUpload,
  IconCloudDownload,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import useSWR from "swr"
import * as XLSX from "xlsx"
import JSZip from "jszip"
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
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { usePermissions } from "@/hooks/use-permissions"
import { PermissionButton } from "@/components/access"
import { ProductForm } from "@/components/products/product-form"
import { MissingPhoto } from "@/components/products/missing-photo"
import Link from "next/link"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
  category_name: string | null
  thumbnail_url: string | null
  is_active: boolean
  is_featured: boolean
  is_best_seller: boolean
  created_at: string
  variations_count: number
  product_images?: ProductImage[]
}

interface ProductImage {
  id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
}

interface Category {
  id: string
  name: string
  slug: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ProductsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const t = useTranslations("products")
  const tc = useTranslations("common")
  const tn = useTranslations("nav")
  const { data: products = [], mutate, isLoading } = useSWR<Product[]>("/api/products", fetcher)
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher)
  
  const searchParams = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [importData, setImportData] = React.useState<{ name: string; category: string; description: string; imageBlob?: Blob; imagePreview?: string }[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  React.useEffect(() => {
    if (searchParams.get("create") === "true") setIsCreateOpen(true)
  }, [searchParams])

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const handleDelete = async () => {
    if (!deletingProduct) return
    await fetch(`/api/products/${deletingProduct.id}`, { method: "DELETE" })
    mutate()
    toast.success(t("deleteSuccess"))
    setDeletingProduct(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const arrayBuffer = await file.arrayBuffer()

    // Parse spreadsheet data
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })

    const parsed = rows
      .filter((row) => row["Model"] || row["model"])
      .map((row) => ({
        name: row["Model"] || row["model"] || "",
        category: row["Product"] || row["product"] || "",
        description: row["Specification"] || row["specification"] || "",
      }))

    // Fill down category for merged cells
    let lastCategory = ""
    for (const item of parsed) {
      if (item.category) lastCategory = item.category
      else item.category = lastCategory
    }

    // Extract images from the XLSX ZIP
    const imageMap: Record<number, { blob: Blob; preview: string }> = {}
    try {
      const zip = await JSZip.loadAsync(arrayBuffer)

      // Parse the drawing relationships to map images to rows
      const drawingRelsFile = zip.file(/xl\/drawings\/_rels\/.*\.rels/)[0]
      const drawingFile = zip.file(/xl\/drawings\/drawing.*\.xml/)[0]

      if (drawingFile && drawingRelsFile) {
        const drawingXml = await drawingFile.async("text")
        const relsXml = await drawingRelsFile.async("text")

        // Parse rels: map rId -> image file path
        const rIdToFile: Record<string, string> = {}
        const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)
        for (const m of relMatches) {
          rIdToFile[m[1]] = m[2].replace("..", "xl")
        }

        // Parse drawing: map row number -> rId
        // Each twoCellAnchor has <xdr:from><xdr:row>N</xdr:row> and <a:blip r:embed="rIdN">
        const anchorRegex = /<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g
        const anchors = drawingXml.match(anchorRegex) || []

        for (const anchor of anchors) {
          const rowMatch = anchor.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)
          const embedMatch = anchor.match(/r:embed="(rId\d+)"/)
          if (rowMatch && embedMatch) {
            const row = parseInt(rowMatch[1]) - 1 // Convert to 0-based data row (minus header)
            const rId = embedMatch[1]
            const imagePath = rIdToFile[rId]
            if (imagePath) {
              const imageFile = zip.file(imagePath)
              if (imageFile) {
                const imageData = await imageFile.async("arraybuffer")
                const ext = imagePath.split(".").pop() || "png"
                const blob = new Blob([new Uint8Array(imageData as ArrayBuffer)], { type: `image/${ext === "jpg" ? "jpeg" : ext}` })
                const preview = URL.createObjectURL(blob)
                imageMap[row] = { blob, preview }
              }
            }
          }
        }
      }
    } catch {
      // Image extraction failed - continue without images
    }

    // Attach images to parsed product data
    const withImages = parsed.map((item, i) => ({
      ...item,
      imageBlob: imageMap[i]?.blob,
      imagePreview: imageMap[i]?.preview,
    }))

    setImportData(withImages)
    setIsImportOpen(true)
    e.target.value = ""
  }

  const handleImport = async () => {
    setIsImporting(true)

    // Upload images first and collect URLs
    const productsWithUrls = await Promise.all(
      importData.map(async (item) => {
        let thumbnail_url: string | null = null
        if (item.imageBlob) {
          const formData = new FormData()
          const ext = item.imageBlob.type.split("/")[1] || "png"
          formData.append("file", item.imageBlob, `${item.name}.${ext}`)
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          if (res.ok) {
            const { url } = await res.json()
            thumbnail_url = url
          }
        }
        return {
          name: item.name,
          category: item.category,
          description: item.description,
          thumbnail_url,
        }
      })
    )

    await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: productsWithUrls }),
    })
    mutate()
    toast.success(t("importSuccess"))
    // Clean up blob URLs
    importData.forEach((item) => {
      if (item.imagePreview) URL.revokeObjectURL(item.imagePreview)
    })
    setIsImporting(false)
    setIsImportOpen(false)
    setImportData([])
  }

  const columns: ColumnDef<Product>[] = [
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
      header: t("product"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail_url ? (
            <img
              src={row.original.thumbnail_url}
              alt={row.original.name}
              className="size-10 rounded-md object-cover"
            />
          ) : (
            <MissingPhoto className="size-10" />
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
            {hasPermission("products:write") && (
              <DropdownMenuItem onClick={() => setEditingProductId(row.original.id)}>
                <IconEdit className="mr-2 size-4" />
                {tc("edit")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${row.original.id}`)}>
              <IconEye className="mr-2 size-4" />
              {tc("view")}
            </DropdownMenuItem>
            {hasPermission("products:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingProduct(row.original)}
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
    data: products,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, globalFilter, pagination },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      const p = row.original
      return [
        p.name, p.slug, p.description, p.category_name,
      ].some((v) => v && String(v).toLowerCase().includes(q))
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
          {hasPermission("products:write") && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/products/to-complete">{tn("toComplete")}</Link>
            </Button>
          )}
          {hasPermission("brands.manage") && hasPermission("products:write") && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/products/import">
                <IconCloudDownload />
                <span className="hidden sm:inline">{tn("bulkImport")}</span>
              </Link>
            </Button>
          )}
          <PermissionButton permission="products:write" onClick={() => setIsCreateOpen(true)}>
            <IconPlus />
            {t("addProduct")}
          </PermissionButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <PermissionButton permission="products:write" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <IconUpload />
            {t("importProducts")}
          </PermissionButton>
        </PageHeader>

          <div className="flex items-center gap-2">
            <Input
              placeholder={t("searchProducts")}
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
                        <div className="text-muted-foreground">{t("noProducts")}</div>
                        {hasPermission("products:write") && (
                          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                            <IconPlus className="size-4" />
                            {t("addProduct")}
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

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createProduct")}</DialogTitle>
              <DialogDescription>{t("createProductDesc")}</DialogDescription>
            </DialogHeader>
            {isCreateOpen && (
              <ProductForm
                categories={categories}
                onSaved={() => {
                  mutate()
                  setIsCreateOpen(false)
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingProductId} onOpenChange={() => setEditingProductId(null)}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("updateProduct")}</DialogTitle>
              <DialogDescription>{t("updateProductDesc")}</DialogDescription>
            </DialogHeader>
            {editingProductId && (
              <ProductForm
                key={editingProductId}
                productId={editingProductId}
                categories={categories}
                onSaved={() => {
                  mutate()
                  setEditingProductId(null)
                }}
                onCancel={() => setEditingProductId(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingProduct(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete}>{tc("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Dialog */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{t("importProducts")}</DialogTitle>
              <DialogDescription>{importData.length} product(s) found in the file</DialogDescription>
            </DialogHeader>
            <div className="overflow-auto flex-1 rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Model (Name)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Specification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        {item.imagePreview ? (
                          <img src={item.imagePreview} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>{tc("cancel")}</Button>
              <Button onClick={handleImport} disabled={isImporting || importData.length === 0}>
                {isImporting ? "Importing..." : `Import ${importData.length} Products`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
