"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { isRtl } from "@/i18n/config"
import type { Locale } from "@/i18n/config"

import {
  IconBox,
  IconCategory,
  IconDashboard,
  IconHelp,
  IconBellRinging,
  IconPackage,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconStar,
  IconUsers,
  IconUserShield,
  IconChartBar,
  IconTag,
  IconBarcode,
  IconDeviceMobile,
  IconChecklist,
  IconCloudDownload,
} from "@tabler/icons-react"

import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = usePermissions()
  const locale = useLocale() as Locale
  const t = useTranslations("nav")
  const tBrand = useTranslations("brand")

  const navMain = [
    {
      title: t("dashboard"),
      url: "/dashboard",
      icon: IconDashboard,
      permission: null,
    },
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: IconChartBar,
      permission: "reports:read",
    },
    {
      title: t("products"),
      url: "/dashboard/products",
      icon: IconBox,
      permission: "products:read",
    },
    {
      title: t("toComplete"),
      url: "/dashboard/products/to-complete",
      icon: IconChecklist,
      permission: "products:write",
    },
    {
      title: t("bulkImport"),
      url: "/dashboard/products/import",
      icon: IconCloudDownload,
      permission: "brands.manage",
    },
    {
      title: t("categories"),
      url: "/dashboard/categories",
      icon: IconCategory,
      permission: "products:read",
    },
    {
      title: t("brands"),
      url: "/dashboard/brands",
      icon: IconTag,
      permission: "brands.manage",
    },
    {
      title: t("orders"),
      url: "/dashboard/orders",
      icon: IconShoppingCart,
      permission: "orders:read",
    },
    {
      title: t("reviews"),
      url: "/dashboard/reviews",
      icon: IconStar,
      permission: "reviews:read",
    },
  ]

  const documents = [
    {
      name: t("users"),
      url: "/dashboard/users",
      icon: IconUsers,
      permission: "users:read",
    },
    {
      name: t("rolesPermissions"),
      url: "/dashboard/roles",
      icon: IconUserShield,
      permission: "roles:manage",
    },
    {
      name: t("announcements"),
      url: "/dashboard/announcements",
      icon: IconBellRinging,
      permission: "announcements:read",
    },
  ]

  const inventory = [
    {
      name: t("stockReception"),
      url: "/dashboard/inventory/reception",
      icon: IconBarcode,
      permission: "inventory.imei",
    },
    {
      name: t("imeiInventory"),
      url: "/dashboard/inventory/imei",
      icon: IconDeviceMobile,
      permission: "inventory.imei",
    },
  ]

  const filteredInventory = inventory.filter(
    (item) => hasPermission(item.permission)
  )

  const filteredNavMain = navMain.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  const filteredDocuments = documents.filter(
    (item) => hasPermission(item.permission)
  )

  return (
    <Sidebar collapsible="offcanvas" side={isRtl(locale) ? "right" : "left"} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <IconPackage className="size-5!" />
                <span className="text-base font-semibold">{tBrand("name")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        {filteredInventory.length > 0 && (
          <NavDocuments label={t("inventory")} items={filteredInventory} />
        )}
        <NavDocuments items={filteredDocuments} />
        </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ? { name: user.full_name || user.email, email: user.email, avatar: "" } : { name: "", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
