"use client";

import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/auth.service";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader({ email }: { email: string }) {
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
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        <span className="hidden sm:inline">Signed in as </span>
        <span className="font-mono text-xs text-foreground">{email}</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
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
