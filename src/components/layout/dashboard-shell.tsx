"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppCommandMenu } from "@/components/layout/app-command-menu";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AppUpdateBanner } from "@/components/layout/app-update-banner";
import { NotificationBanner } from "@/components/layout/notification-banner";
import { AnnouncementsSubscriptionProvider } from "@/components/providers/announcements-subscription-provider";
import { DesktopVersionProvider } from "@/components/providers/desktop-version-provider";
import { PushNotificationProvider } from "@/components/providers/push-notification-provider";
import { RealtimeSyncProvider } from "@/components/providers/realtime-sync-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  email,
  displayName,
  userId,
  isSuperAdmin,
}: {
  children: React.ReactNode;
  email: string;
  displayName: string | null;
  userId: string;
  isSuperAdmin: boolean;
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
      <AnnouncementsSubscriptionProvider>
        <RealtimeSyncProvider userId={userId}>
          <DesktopVersionProvider userId={userId}>
            <PushNotificationProvider>
              <AppSidebar
                email={email}
                displayName={displayName}
                isSuperAdmin={isSuperAdmin}
              />
              <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <DashboardHeader />
                <AppCommandMenu />
                <div className="app-canvas flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                  <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
                    <AppUpdateBanner />
                    <NotificationBanner />
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </PushNotificationProvider>
          </DesktopVersionProvider>
        </RealtimeSyncProvider>
      </AnnouncementsSubscriptionProvider>
    </SidebarProvider>
  );
}
