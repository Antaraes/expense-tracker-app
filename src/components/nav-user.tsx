"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { authService } from "@/features/auth/services/auth.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function initials(email: string, displayName: string | null) {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

export function NavUser({
  email,
  displayName,
}: {
  email: string;
  displayName: string | null;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const label = displayName?.trim() || email.split("@")[0] || "Account";

  async function handleSignOut() {
    await authService.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {initials(email, displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs">
                    {initials(email, displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
