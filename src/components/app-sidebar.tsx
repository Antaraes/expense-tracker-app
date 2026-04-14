"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarClock,
  LayoutDashboard,
  Package,
  PiggyBank,
  Settings,
  Shield,
  Tags,
  Wallet,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Budgets", url: "/budgets", icon: PiggyBank },
  { title: "Recurring", url: "/recurring", icon: CalendarClock },
  { title: "Categories", url: "/categories", icon: Tags },
  { title: "Settings", url: "/settings", icon: Settings },
];

/** Superadmin: admin-focused nav only (extend `navSuperAdminSection` later). */
const navSuperAdminSection = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Versions", url: "/admin/versions", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({
  email,
  displayName,
  isSuperAdmin,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  email: string;
  displayName: string | null;
  isSuperAdmin: boolean;
}) {
  const navItems = isSuperAdmin ? navSuperAdminSection : navMain;
  const sidebarSubtitle = isSuperAdmin ? "Admin" : "Overview";
  const homeHref = isSuperAdmin ? "/admin" : "/dashboard";

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Wallet className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{APP_NAME}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sidebarSubtitle}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={email} displayName={displayName} />
      </SidebarFooter>
    </Sidebar>
  );
}
