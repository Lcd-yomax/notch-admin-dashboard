"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product?: Product | null
  categories: Category[]
  onSave: (data: Partial<Product> & { images?: File[]; existingImages?: ProductImage[] }) => void
  onCancel: () => void
}) {
  const [name, setName] = React.useState(product?.name || "")
  const [slug, setSlug] = React.useState(product?.slug || "")
  const [description, setDescription] = React.useState(product?.description || "")
  const [categoryId, setCategoryId] = React.useState(product?.category_id || "")
  const [isActive, setIsActive] = React.useState(product?.is_active ?? true)
  const [isFeatured, setIsFeatured] = React.useState(product?.is_featured ?? false)
  const [isBestSeller, setIsBestSeller] = React.useState(product?.is_best_seller ?? false)

  // Image state
  const [newFiles, setNewFiles] = React.useState<File[]>([])
  const [newPreviews, setNewPreviews] = React.useState<string[]>([])
  const [existingImages, setExistingImages] = React.useState<ProductImage[]>(product?.product_images || [])
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!product) {
      setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
    }
  }

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setNewFiles((prev) => [...prev, ...files])
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ""
  }

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id))
  }

  React.useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      slug,
      description: description || null,
      category_id: categoryId || null,
      thumbnail_url: null,
      is_active: isActive,
      is_featured: isFeatured,
      is_best_seller: isBestSeller,
      images: newFiles,
      existingImages,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter product name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="product-slug"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter product description"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId || "none"} onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Multi-image upload */}
      <div className="space-y-2">
        <Label>Product Images</Label>
        <div className="flex flex-wrap gap-3">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative size-20 rounded-lg border overflow-hidden">
              <img src={img.url} alt={img.alt_text || ""} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(img.id)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash className="size-4 text-white" />
              </button>
            </div>
          ))}
          {newPreviews.map((src, i) => (
            <div key={`new-${i}`} className="group relative size-20 rounded-lg border overflow-hidden">
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewFile(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash className="size-4 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <IconPlus className="size-5" />
            <span className="text-[10px]">Add</span>
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAddFiles}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="is_active">Active</Label>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="is_featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
          <Label htmlFor="is_featured">Featured</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_best_seller" checked={isBestSeller} onCheckedChange={setIsBestSeller} />
          <Label htmlFor="is_best_seller">Best Seller</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{product ? "Update" : "Create"} Product</Button>
      </DialogFooter>
    </form>
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const { data: products = [], mutate, isLoading } = useSWR<Product[]>("/api/products", fetcher)
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [importData, setImportData] = React.useState<{ name: string; category: string; description: string; imageBlob?: Blob; imagePreview?: string }[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        urls.push(url)
      }
    }
    return urls
  }

  const handleCreate = async (data: Partial<Product> & { images?: File[]; existingImages?: ProductImage[] }) => {
    const { images, existingImages, ...productData } = data

    // Upload new images first
    const imageUrls = images?.length ? await uploadImages(images) : []

    // Set thumbnail to first image if available
    if (imageUrls.length > 0) {
      productData.thumbnail_url = imageUrls[0]
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    })
    const created = await res.json()

    // Save images to product_images table
    if (created.id && imageUrls.length > 0) {
      await fetch(`/api/products/${created.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: imageUrls }),
      })
    }

    mutate()
    setIsCreateOpen(false)
  }

  const handleUpdate = async (data: Partial<Product> & { images?: File[]; existingImages?: ProductImage[] }) => {
    if (!editingProduct) return
    const { images, existingImages, ...productData } = data

    // Upload new images
    const newImageUrls = images?.length ? await uploadImages(images) : []

    // Set thumbnail: first existing image, or first new image
    const firstExisting = existingImages?.[0]?.url
    productData.thumbnail_url = firstExisting || newImageUrls[0] || null

    await fetch(`/api/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    })

    // Sync images: send existing IDs to keep + new URLs to add
    await fetch(`/api/products/${editingProduct.id}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keepIds: existingImages?.map((img) => img.id) || [],
        newUrls: newImageUrls,
      }),
    })

    mutate()
    setEditingProduct(null)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    await fetch(`/api/products/${deletingProduct.id}`, { method: "DELETE" })
    mutate()
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
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail_url ? (
            <img
              src={row.original.thumbnail_url}
              alt={row.original.name}
              className="size-10 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              No img
            </div>
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
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground">
          {row.original.category_name || "Uncategorized"}
        </Badge>
      ),
    },
    {
      accessorKey: "variations_count",
      header: "Variations",
      cell: ({ row }) => <div className="text-center">{row.original.variations_count}</div>,
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
            {hasPermission("products:write") && (
              <DropdownMenuItem onClick={async () => {
                const res = await fetch(`/api/products/${row.original.id}`)
                const full = await res.json()
                setEditingProduct({ ...row.original, product_images: full.product_images || [] })
              }}>
                <IconEdit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${row.original.id}`)}>
              <IconEye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            {hasPermission("products:delete") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingProduct(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash className="mr-2 size-4" />
                  Delete
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
          title="Products"
          description="Manage your product catalog"
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
          {hasPermission("products:write") && (
            <>
              <Button onClick={() => setIsCreateOpen(true)}>
                <IconPlus />
                Add Product
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <IconUpload />
                Import Excel
              </Button>
            </>
          )}
        </PageHeader>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search products..."
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
                        <div className="text-muted-foreground">No products found</div>
                        {hasPermission("products:write") && (
                          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                            <IconPlus className="size-4" />
                            Add Product
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Product</DialogTitle>
              <DialogDescription>Add a new product to your catalog.</DialogDescription>
            </DialogHeader>
            <ProductForm categories={categories} onSave={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product information.</DialogDescription>
            </DialogHeader>
            <ProductForm product={editingProduct} categories={categories} onSave={handleUpdate} onCancel={() => setEditingProduct(null)} />
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
              <Button variant="outline" onClick={() => setDeletingProduct(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Dialog */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Import Products</DialogTitle>
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
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={isImporting || importData.length === 0}>
                {isImporting ? "Importing..." : `Import ${importData.length} Products`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
