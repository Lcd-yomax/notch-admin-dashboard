"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { IconPlus, IconTrash, IconArrowLeft, IconCheck, IconSelector, IconClock } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().min(8, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().min(2, "City is required"),
  address: z.string().min(5, "Address is required"),
  total_amount: z.coerce.number().min(0),
  notes: z.string().optional(),
  code_suivi: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  click_id: z.string().optional(),
  referrer: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().min(1, "Product is required"),
      variation_id: z.string().min(1, "Variation is required"),
      quantity: z.coerce.number().min(1),
      unit_price: z.coerce.number().min(0),
    })
  ).min(1, "At least one item is required"),
})

type FormValues = z.infer<typeof formSchema>

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function OrderForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { data: productsData, isLoading: isLoadingProducts } = useSWR("/api/products/search", fetcher)
  const { data: activity = [] } = useSWR(
    initialData?.id ? `/api/orders/${initialData.id}/activity` : null,
    fetcher
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: initialData?.full_name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      city: initialData?.city || "",
      address: initialData?.address || "",
      total_amount: initialData?.total_amount || 0,
      notes: initialData?.notes || "",
      code_suivi: initialData?.code_suivi || "",
      utm_source: initialData?.utm_source || "",
      utm_medium: initialData?.utm_medium || "",
      utm_campaign: initialData?.utm_campaign || "",
      click_id: initialData?.click_id || "",
      referrer: initialData?.referrer || "",
      items: initialData?.order_items?.map((item: any) => ({
        product_id: item.product_variations?.product_id || item.product_id || "", 
        variation_id: item.variation_id || "",
        quantity: item.quantity || 1,
        unit_price: item.price || item.unit_price || 0,
      })) || [
        { product_id: "", variation_id: "", quantity: 1, unit_price: 0 }
      ],
    },
  })

  // To map product_id correctly in edit mode, wait, product_variations doesn't return product_id directly without joining.
  // Actually, we can just allow filtering variations by chosen product.

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  })

  // Auto-calculate total
  const watchItems = form.watch("items")
  const watchTotalAmount = form.watch("total_amount")

  React.useEffect(() => {
    // Only auto-calc if we actually have items with valid prices
    const total = watchItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0)
    // Only update if it's not a manual override and is not 0 
    // Wait, let's just allow a button to "Compute Total" or do it automatically but allow override.
    // For simplicity, let's do it manually if user overrides, but let's sync initially.
  }, [watchItems])

  const handleComputeTotal = () => {
    const total = watchItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0)
    // Add typical shipping cost? Or just item total
    form.setValue("total_amount", total)
  }

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      const url = initialData ? `/api/orders/${initialData.id}` : "/api/orders"
      const method = initialData ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save order")
      }

      toast.success(initialData ? "Order updated successfully" : "Order created successfully")
      router.push("/dashboard/orders")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-6xl mx-auto pb-10">
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
          {initialData ? `Edit Order ${initialData.order_number}` : "Create New Order"}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input {...form.register("full_name")} placeholder="John Doe" />
                  {form.formState.errors.full_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input {...form.register("phone")} placeholder="+212 6..." />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input {...form.register("email")} placeholder="john@example.com" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input {...form.register("city")} placeholder="Casablanca" />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea {...form.register("address")} placeholder="123 Main St..." className="min-h-[60px]" />
                </div>

                <div className="space-y-2">
                  <Label>Tracking Code</Label>
                  <Input {...form.register("code_suivi")} placeholder="Optional" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const selectedProductId = form.watch(`items.${index}.product_id`)
                const selectedProduct = productsData?.find((p: any) => p.id === selectedProductId)
                const variations = selectedProduct?.product_variations || []

                return (
                  <div key={field.id} className="relative p-4 border rounded-md bg-muted/40 grid gap-4">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                    >
                      <IconTrash className="size-4" />
                    </button>

                    <div className="grid grid-cols-1 gap-4 mr-6">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        {isLoadingProducts ? (
                          <div className="h-10 border rounded px-3 flex items-center"><Spinner className="size-4 mr-2"/> Loading...</div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal text-left"
                              >
                                {selectedProductId
                                  ? productsData?.find((p: any) => p.id === selectedProductId)?.name
                                  : "Select product..."}
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
                                        onSelect={(currentValue) => {
                                          // Note: currentValue is usually lowercased by CommandItem, so match by ID instead or use value as id.
                                          // Workaround for shadcn/ui command: use stringified ID or carefully pass onSelect
                                          form.setValue(`items.${index}.product_id`, p.id)
                                          form.setValue(`items.${index}.variation_id`, "")
                                          // Hack to close popover natively if needed, but clicking updates state.
                                        }}
                                      >
                                        <IconCheck
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedProductId === p.id ? "opacity-100" : "opacity-0"
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
                        {form.formState.errors.items?.[index]?.product_id && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.product_id?.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Variation *</Label>
                        <Select
                           disabled={!selectedProductId || variations.length === 0}
                           value={form.watch(`items.${index}.variation_id`)}
                           onValueChange={(val) => {
                             form.setValue(`items.${index}.variation_id`, val)
                             const variation = variations.find((v: any) => v.id === val)
                             if (variation) {
                               form.setValue(`items.${index}.unit_price`, variation.price)
                             }
                           }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select variation" />
                          </SelectTrigger>
                          <SelectContent>
                            {variations.map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.color || "Default"} - {v.size || "Standard"} — {v.price} DH
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.items?.[index]?.variation_id && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.variation_id?.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input type="number" {...form.register(`items.${index}.quantity`)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit Price (DH)</Label>
                          <Input type="number" step="0.01" {...form.register(`items.${index}.unit_price`)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => append({ product_id: "", variation_id: "", quantity: 1, unit_price: 0 })}
              >
                <IconPlus className="size-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Total Amount (DH) *</Label>
                <Input type="number" step="0.01" className="text-lg font-bold" {...form.register("total_amount")} />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={handleComputeTotal}>
                Suggest Total from Items
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Order Notes / Instructions</Label>
                <Textarea {...form.register("notes")} placeholder="Special instructions..." className="min-h-[120px]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Ads & Tracking (Tracability)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>UTM Source</Label>
                <Input {...form.register("utm_source")} placeholder="e.g. facebook" />
              </div>
              <div className="space-y-2">
                <Label>UTM Campaign</Label>
                <Input {...form.register("utm_campaign")} placeholder="e.g. summer_sale" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Click ID</Label>
                  <Input {...form.register("click_id")} placeholder="fbclid..." />
                </div>
                <div className="space-y-2">
                  <Label>UTM Medium</Label>
                  <Input {...form.register("utm_medium")} placeholder="e.g. cpc" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Referrer</Label>
                <Input {...form.register("referrer")} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {initialData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconClock className="size-4" />
                  Audit Tracking / History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[300px] overflow-y-auto px-4 pb-4">
                  {activity.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No activity recorded yet
                    </p>
                  ) : (
                    activity.map((entry: any, idx: number) => (
                      <div key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
                        {idx < activity.length - 1 && (
                          <div className="absolute start-[7px] top-5 bottom-0 w-px bg-border" />
                        )}
                        <div className="mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-primary bg-background" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {entry.action === "status_changed"
                              ? `Status changed from ${entry.old_value ?? "pending"} to ${entry.new_value ?? "pending"}`
                              : entry.action === "created"
                                ? "Order Created"
                                : entry.action}
                          </p>
                          {entry.note && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {entry.note}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {entry.user_name && <span>{entry.user_name}</span>}
                            {entry.user_name && <span>·</span>}
                            <span>
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4 mr-2" />}
          {initialData ? "Save Changes" : "Create Order"}
        </Button>
      </div>
    </form>
  )
}
