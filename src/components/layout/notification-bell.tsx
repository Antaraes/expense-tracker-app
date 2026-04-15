"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  announcementsService,
  type AnnouncementRow,
} from "@/features/notifications/services/announcements.service";
import { dispatchAnnouncementsChanged } from "@/features/notifications/lib/announcements-events";
import { cn } from "@/lib/utils";

function typeAccent(type: string) {
  switch (type) {
    case "alert":
      return "text-destructive";
    case "maintenance":
      return "text-amber-600 dark:text-amber-400";
    case "release":
    case "feature":
      return "text-sky-600 dark:text-sky-400";
    default:
      return "text-muted-foreground";
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<
    Array<AnnouncementRow & { isRead: boolean }>
  >([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await announcementsService.listForBell();
    if (error) return;
    setItems(data);
    setUnread(data.filter((r) => !r.isRead).length);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  async function onItemClick(row: AnnouncementRow & { isRead: boolean }) {
    if (!row.isRead) {
      await announcementsService.markAsRead(row.id);
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, isRead: true } : p))
      );
      dispatchAnnouncementsChanged();
    }
    router.refresh();
  }

  async function markAllRead() {
    const unreadIds = items.filter((i) => !i.isRead).map((i) => i.id);
    await announcementsService.markAllRead(unreadIds);
    setUnread(0);
    setItems((prev) => prev.map((p) => ({ ...p, isRead: true })));
    dispatchAnnouncementsChanged();
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px] leading-none"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No announcements.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {items.map((row) => (
              <DropdownMenuItem
                key={row.id}
                className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
                onSelect={(e) => {
                  e.preventDefault();
                  void onItemClick(row);
                  if (row.action_url) {
                    window.open(row.action_url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <span
                  className={cn(
                    "font-medium text-sm",
                    !row.isRead && "font-semibold",
                    typeAccent(row.type)
                  )}
                >
                  {row.title}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {row.body}
                </span>
                {row.published_at ? (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(row.published_at).toLocaleString()}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {items.length > 0 && unread > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-center"
              onSelect={(e) => {
                e.preventDefault();
                void markAllRead();
              }}
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
