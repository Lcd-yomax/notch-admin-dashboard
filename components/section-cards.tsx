"use client"

import * as React from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import { IconBox, IconShoppingCart, IconStar, IconUsers, IconChecklist, IconCash } from "@tabler/icons-react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function SectionCards() {
  const t = useTranslations("cards")
  const { data: products } = useSWR("/api/products", fetcher)
  const { data: orders } = useSWR("/api/orders", fetcher)
  const { data: reviews } = useSWR("/api/reviews", fetcher)
  const { data: users } = useSWR("/api/users", fetcher)
  const { data: roles } = useSWR("/api/roles", fetcher)

  const productCount = Array.isArray(products) ? products.length : 0
  const orderCount = Array.isArray(orders) ? orders.length : 0
  const completedOrders = Array.isArray(orders) ? orders.filter((o: any) => o.status === "confirmed" || o.status === "delivered" || o.status === "shipped") : []
  const completedCount = completedOrders.length
  const totalRevenue = completedOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0
  const userCount = Array.isArray(users) ? users.length : 0
  const roleCount = Array.isArray(roles) ? roles.length : 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconShoppingCart className="size-4" />
            {t("totalOrders")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {orderCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {orderCount === 0 ? t("noOrders") : t("totalOrders")}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconChecklist className="size-4" />
            {t("completedOrders")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {completedCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {completedCount === 0 ? t("noCompletedOrders") : t("completedOrders")}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCash className="size-4" />
            {t("revenue")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalRevenue.toFixed(2)} DH
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {totalRevenue === 0 ? t("noRevenue") : t("revenue")}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconBox className="size-4" />
            {t("products")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {productCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {productCount === 0 ? t("noProducts") : t("products")}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconStar className="size-4" />
            {t("reviews")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {reviewCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {reviewCount === 0 ? t("noReviews") : t("reviews")}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4" />
            {t("adminUsers")}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {userCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {t("rolesConfigured", { count: roleCount })}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
