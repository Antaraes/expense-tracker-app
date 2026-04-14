"use client";

import { useRouter } from "next/navigation";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { authService } from "@/features/auth/services/auth.service";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";

export function DashboardHeader() {
  const router = useRouter();

  async function handleSignOut() {
    await authService.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 print:hidden lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AppBreadcrumb />
        <p className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <span className="hidden lg:inline">Quick nav</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
