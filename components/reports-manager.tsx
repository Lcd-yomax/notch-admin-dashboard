"use client"

import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import {
  IconChartBar,
  IconShoppingCart,
  IconPackage,
  IconCalendar,
  IconDownload,
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import useSWR from "swr"
import { useTranslations } from "next-intl"

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658']

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ReportsManager() {
  const t = useTranslations("orders")
  const tc = useTranslations("common")

  const [dateRange, setDateRange] = useState('last30')
  const [reportType, setReportType] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // SWR fetching
  const { data: orders = [], isLoading: loadingOrders, mutate: mutateOrders } = useSWR<any[]>("/api/orders", fetcher)
  const { data: products = [], isLoading: loadingProducts, mutate: mutateProducts } = useSWR<any[]>("/api/products", fetcher)
  const loading = loadingOrders || loadingProducts

  const filteredOrders = useMemo(() => {
    const now = new Date()
    let start = new Date(now)
    let end = new Date(now)

    if (dateRange === 'today') { start = now; end = now }
    else if (dateRange === 'yesterday') { start = subDays(now, 1); end = subDays(now, 1) }
    else if (dateRange === 'last7') { start = subDays(now, 7); end = now }
    else if (dateRange === 'last30') { start = subDays(now, 30); end = now }
    else if (dateRange === 'thisMonth') { start = startOfMonth(now); end = endOfMonth(now) }
    else if (dateRange === 'lastMonth') { 
      const lm = subDays(startOfMonth(now), 1)
      start = startOfMonth(lm); end = endOfMonth(lm) 
    }
    else if (dateRange === 'thisYear') { start = startOfYear(now); end = endOfYear(now) }
    else if (dateRange === 'lastYear') { 
      const ly = subDays(startOfYear(now), 1)
      start = startOfYear(ly); end = endOfYear(ly) 
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    return orders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= start && orderDate <= end
    })
  }, [orders, dateRange])

  // Key Metrics
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const totalOrders = filteredOrders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const completedOrders = filteredOrders.filter(o => ['delivered', 'confirmed', 'shipped'].includes(o.status)).length

  // Chart Data
  const dailySalesData = useMemo(() => {
    const days: Record<string, { date: string; sales: number; count: number }> = {}
    filteredOrders.forEach(o => {
      const dateStr = format(new Date(o.created_at), 'yyyy-MM-dd')
      if (!days[dateStr]) days[dateStr] = { date: dateStr, sales: 0, count: 0 }
      days[dateStr].sales += o.total_amount
      days[dateStr].count += 1
    })
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredOrders])

  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    filteredOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
    })
    return Object.entries(statusCounts).map(([status, count], i) => ({
      name: t(status) || status,
      value: count,
      color: CHART_COLORS[i % CHART_COLORS.length]
    }))
  }, [filteredOrders, t])

  const searchedOrders = filteredOrders.filter(o => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const csvContent = [headers, ...data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const refreshData = () => {
    mutateOrders()
    mutateProducts()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <IconCalendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <IconSearch className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={tc("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <IconRefresh className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tc("refresh")}
          </Button>
          <Button variant="outline" onClick={() => exportToCSV(dailySalesData, 'summary')}>
            <IconDownload className="h-4 w-4 mr-2" />
            {tc("export")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} DH</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOrderValue.toFixed(2)} DH</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Conversions</CardTitle>
            <IconPackage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Orders</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} DH`} />
                    <Area type="monotone" dataKey="sales" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Transaction Count</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Orders Logs</CardTitle>
                  <CardDescription>Detailed list of matched transactions ({searchedOrders.length} total)</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("order")}</TableHead>
                        <TableHead>{tc("date")}</TableHead>
                        <TableHead>{t("customer")}</TableHead>
                        <TableHead>{t("total")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedOrders.slice(0, 50).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium text-sm">{sale.order_number}</TableCell>
                          <TableCell className="text-sm">{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{sale.full_name}</TableCell>
                          <TableCell className="text-sm font-semibold">{sale.total_amount.toFixed(2)} DH</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(sale.status) || sale.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <IconPackage className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <IconPackage className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.filter((p: any) => p.is_active).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Sellers</CardTitle>
                <IconPackage className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.filter((p: any) => p.is_best_seller).length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Catalog Products Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Variations</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 50).map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-sm">{product.name}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary">{product.category_name || "Uncategorized"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{product.variations_count}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "outline"}>
                            {product.is_active ? tc("active") : tc("inactive")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}