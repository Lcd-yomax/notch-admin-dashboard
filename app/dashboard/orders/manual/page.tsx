"use client"

import { AccessDenied, Can } from "@/components/access"
import { ManualOrderForm } from "@/components/orders/manual-order-form"

export default function ManualOrderPage() {
  return (
    <div className="px-4 py-4 md:py-6 lg:px-6">
      <Can permission="products:write" fallback={<AccessDenied />}>
        <ManualOrderForm />
      </Can>
    </div>
  )
}
