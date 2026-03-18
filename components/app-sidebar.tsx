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
      title: t("products"),
      url: "/dashboard/products",
      icon: IconBox,
      permission: "products:read",
    },
    {
      title: t("categories"),
      url: "/dashboard/categories",
      icon: IconCategory,
      permission: "products:read",
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
        </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ? { name: user.full_name || user.email, email: user.email, avatar: "" } : { name: "", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
