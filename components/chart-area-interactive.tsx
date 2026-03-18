"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import useSWR from "swr"

import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { useTranslations, useLocale } from 'next-intl'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function aggregateOrdersByDate(orders: any[]): { date: string; orders: number }[] {
  const map = new Map<string, number>()
  for (const order of orders) {
    const day = order.created_at?.split("T")[0]
    if (day) {
      map.set(day, (map.get(day) || 0) + 1)
    }
  }
  const result = Array.from(map.entries())
    .map(([date, count]) => ({ date, orders: count }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return result
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const t = useTranslations("chart")
  const locale = useLocale()
  const { data: orders } = useSWR("/api/orders", fetcher)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const chartData = React.useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      // Generate placeholder dates for the selected range
      const now = new Date()
      const daysMap: Record<string, number> = { "90d": 90, "30d": 30, "7d": 7 }
      const days = daysMap[timeRange] || 90
      const points: { date: string; orders: number }[] = []
      for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 6))) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        points.push({ date: d.toISOString().split("T")[0], orders: 0 })
      }
      return points
    }
    return aggregateOrdersByDate(orders)
  }, [orders, timeRange])

  const filteredData = React.useMemo(() => {
    const now = new Date()
    const daysMap: Record<string, number> = { "90d": 90, "30d": 30, "7d": 7 }
    const days = daysMap[timeRange] || 90
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - days)
    return chartData.filter(d => new Date(d.date) >= cutoff)
  }, [chartData, timeRange])

  const chartConfig = {
    sales: { label: t("sales") },
    orders: { label: t("orders"), color: "var(--primary)" },
  } satisfies ChartConfig

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("salesOverview")}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {t("orderActivity")}
          </span>
          <span className="@[540px]/card:hidden">{t("orderActivityShort")}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">{t("last3Months")}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t("last30Days")}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t("last7Days")}</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder={t("last3Months")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                {t("last3Months")}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {t("last30Days")}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {t("last7Days")}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-orders)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-orders)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="orders"
              type="natural"
              fill="url(#fillOrders)"
              stroke="var(--color-orders)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
