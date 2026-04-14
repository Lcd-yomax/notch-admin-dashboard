"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { OrderForm } from "@/components/orders/order-form"
import { Spinner } from "@/components/ui/spinner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function EditOrderPage() {
  const { id } = useParams()
  const { data, error, isLoading } = useSWR(`/api/orders/${id}`, fetcher)

  if (isLoading) return <div className="p-10 flex justify-center"><Spinner className="size-8" /></div>
  if (error) return <div className="p-10 text-destructive">Failed to load order: {error.message}</div>
  if (!data) return <div className="p-10">Order not found</div>

  return (
    <div className="p-6">
      <OrderForm initialData={data} />
    </div>
  )
}
