"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { IconArrowLeft, IconUpload, IconStar, IconCheck, IconSelector } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"

const formSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  stars: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  is_approved: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ReviewForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)

  // Use the same search endpoint used in orders to fetch active products
  const { data: productsData, isLoading: isLoadingProducts } = useSWR("/api/products/search", fetcher)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: initialData?.product_id || "",
      full_name: initialData?.full_name || "",
      email: initialData?.email || "",
      stars: initialData?.stars || 5,
      comment: initialData?.comment || "",
      image_url: initialData?.image_url || "",
      is_approved: initialData?.is_approved ?? true,
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = await res.json()
      form.setValue("image_url", url)
      toast.success("Image uploaded successfully")
    } catch (err) {
      toast.error("Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      const url = initialData ? `/api/reviews/${initialData.id}` : "/api/reviews"
      const method = initialData ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save review")
      }

      toast.success(initialData ? "Review updated successfully" : "Review created successfully")
      router.push("/dashboard/reviews")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const watchImageUrl = form.watch("image_url")
  const watchStars = form.watch("stars")

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {initialData ? "Edit Review" : "Create New Review"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            {isLoadingProducts ? (
              <div className="h-10 border rounded px-3 flex items-center bg-muted/40 text-sm text-muted-foreground">
                <Spinner className="size-4 mr-2" /> Loading products...
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal text-left"
                  >
                    {form.watch("product_id")
                      ? productsData?.find((p: any) => p.id === form.watch("product_id"))?.name
                      : "Select a product..."}
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {productsData?.map((p: any) => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              form.setValue("product_id", p.id)
                            }}
                          >
                            <IconCheck
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("product_id") === p.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {form.formState.errors.product_id && (
              <p className="text-sm text-destructive">{form.formState.errors.product_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reviewer Name *</Label>
              <Input {...form.register("full_name")} placeholder="Jane Doe" />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reviewer Email</Label>
              <Input type="email" {...form.register("email")} placeholder="jane@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rating ({watchStars} Stars)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <IconStar
                  key={star}
                  className={`size-6 cursor-pointer hover:text-yellow-400 transition-colors ${
                    star <= watchStars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                  }`}
                  onClick={() => form.setValue("stars", star)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea
              {...form.register("comment")}
              placeholder="What did the customer think about the product?"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Customer Image (Optional)</Label>
            <div className="flex items-start gap-4">
              {watchImageUrl && (
                <div className="relative size-20 rounded-md overflow-hidden border">
                  <Image src={watchImageUrl} alt="Review Image" fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input type="hidden" {...form.register("image_url")} />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => document.getElementById("review-image-upload")?.click()}
                  >
                    {isUploading ? <Spinner className="size-4 mr-2" /> : <IconUpload className="size-4 mr-2" />}
                    Upload Image
                  </Button>
                  {watchImageUrl && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => form.setValue("image_url", "")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  type="file"
                  id="review-image-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm pt-4">
            <div className="space-y-0.5">
              <Label>Approved</Label>
              <p className="text-sm text-muted-foreground">
                Set whether this review is visible on the store front.
              </p>
            </div>
            <Switch
              checked={form.watch("is_approved")}
              onCheckedChange={(val) => form.setValue("is_approved", val)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4 mr-2" />}
          {initialData ? "Save Changes" : "Create Review"}
        </Button>
      </div>
    </form>
  )
}
