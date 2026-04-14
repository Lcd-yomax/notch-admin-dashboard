"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ReviewForm } from "@/components/reviews/review-form"
import { Spinner } from "@/components/ui/spinner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function EditReviewPage() {
  const { id } = useParams()
  const { data, error, isLoading } = useSWR(`/api/reviews/${id}`, fetcher)

  if (isLoading) return <div className="p-10 flex justify-center"><Spinner className="size-8" /></div>
  if (error) return <div className="p-10 text-destructive">Failed to load review: {error.message}</div>
  if (!data) return <div className="p-10">Review not found</div>

  return (
    <div className="p-6">
      <ReviewForm initialData={data} />
    </div>
  )
}
