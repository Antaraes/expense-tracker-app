"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  announcementsService,
  type AnnouncementRow,
} from "@/features/notifications/services/announcements.service";
import {
  ANNOUNCEMENTS_CHANGED,
  dispatchAnnouncementsChanged,
} from "@/features/notifications/lib/announcements-events";
import { cn } from "@/lib/utils";

function bannerTone(type: string) {
  switch (type) {
    case "alert":
      return "border-destructive/50 bg-destructive/10 text-destructive";
    case "maintenance":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    case "release":
    case "feature":
      return "border-sky-500/40 bg-sky-500/10";
    default:
      return "border-border bg-muted/50";
  }
}

export function NotificationBanner() {
  const router = useRouter();
  const [row, setRow] = useState<AnnouncementRow | null>(null);

  const load = useCallback(async () => {
    const next = await announcementsService.getBannerCandidate();
    setRow(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onChanged() {
      void load();
    }
    window.addEventListener(ANNOUNCEMENTS_CHANGED, onChanged);
    return () => window.removeEventListener(ANNOUNCEMENTS_CHANGED, onChanged);
  }, [load]);

  async function acknowledgeAndClose() {
    if (!row) return;
    await announcementsService.markAsRead(row.id);
    setRow(null);
    dispatchAnnouncementsChanged();
    router.refresh();
  }

  if (!row) return null;

  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm",
        bannerTone(row.type)
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{row.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {row.body}
        </p>
        {row.action_url ? (
          <p className="mt-2">
            <Link
              href={row.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {row.action_label?.trim() || "Learn more"}
            </Link>
          </p>
        ) : null}
      </div>
      {row.is_dismissible ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Mark as read and hide"
          onClick={() => void acknowledgeAndClose()}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
