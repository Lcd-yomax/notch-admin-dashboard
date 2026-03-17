"use client"

import * as React from "react"
import Link from "next/link"

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

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    permission: null, // always visible
  },
  {
    title: "Products",
    url: "/dashboard/products",
    icon: IconBox,
    permission: "products:read",
  },
  {
    title: "Categories",
    url: "/dashboard/categories",
    icon: IconCategory,
    permission: "products:read",
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: IconShoppingCart,
    permission: "orders:read",
  },
  {
    title: "Reviews",
    url: "/dashboard/reviews",
    icon: IconStar,
    permission: "reviews:read",
  },
]

const navSecondary = [
  {
    title: "Settings",
    url: "#",
    icon: IconSettings,
  },
  {
    title: "Get Help",
    url: "#",
    icon: IconHelp,
  },
  {
    title: "Search",
    url: "#",
    icon: IconSearch,
  },
]

const documents = [
  {
    name: "Users",
    url: "/dashboard/users",
    icon: IconUsers,
    permission: "users:read",
  },
  {
    name: "Roles & Permissions",
    url: "/dashboard/roles",
    icon: IconUserShield,
    permission: "roles:manage",
  },
  {
    name: "Announcements",
    url: "/dashboard/announcements",
    icon: IconBellRinging,
    permission: "announcements:read",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = usePermissions()

  const filteredNavMain = navMain.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  const filteredDocuments = documents.filter(
    (item) => hasPermission(item.permission)
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <IconPackage className="size-5!" />
                <span className="text-base font-semibold">E-Commerce Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        {filteredDocuments.length > 0 && <NavDocuments items={filteredDocuments} />}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ? { name: user.full_name || user.email, email: user.email, avatar: "" } : { name: "", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
