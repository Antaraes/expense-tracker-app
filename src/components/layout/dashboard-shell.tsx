"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { PushNotificationProvider } from "@/components/providers/push-notification-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  email,
  displayName,
}: {
  children: React.ReactNode;
  email: string;
  displayName: string | null;
}) {
  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      style={
        {
          "--header-height": "3.5rem",
          "--sidebar-width": "14rem",
        } as React.CSSProperties
      }
    >
      <PushNotificationProvider>
        <AppSidebar email={email} displayName={displayName} />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader email={email} />
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</div>
          </div>
        </SidebarInset>
      </PushNotificationProvider>
    </SidebarProvider>
  );
}
