"use client"

import * as React from "react"
import {
  IconBox,
  IconCategory,
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconMegaphone,
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

const data = {
  user: {
    name: "Admin User",
    email: "admin@store.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Products",
      url: "#",
      icon: IconBox,
    },
    {
      title: "Categories",
      url: "#",
      icon: IconCategory,
    },
    {
      title: "Orders",
      url: "#",
      icon: IconShoppingCart,
    },
    {
      title: "Reviews",
      url: "#",
      icon: IconStar,
    },
  ],
  navSecondary: [
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
  ],
  documents: [
    {
      name: "Users",
      url: "#",
      icon: IconUsers,
    },
    {
      name: "Roles & Permissions",
      url: "#",
      icon: IconUserShield,
    },
    {
      name: "Announcements",
      url: "#",
      icon: IconMegaphone,
    },
    {
      name: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <IconPackage className="size-5!" />
                <span className="text-base font-semibold">E-Commerce Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
