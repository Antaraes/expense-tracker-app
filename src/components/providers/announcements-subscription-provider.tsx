"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { notificationVisibleForClient } from "@/features/notifications/lib/targeting";
import { showDesktopNotification } from "@/lib/browser-notifications";

type NotifRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  target_platform: string[] | null;
  target_min_version: string | null;
  target_max_version: string | null;
};

function maybeShowNative(title: string, body: string) {
  if (typeof document !== "undefined" && document.hasFocus()) return;
  if (
    typeof window !== "undefined" &&
    window.electronAPI?.showNativeNotification
  ) {
    void window.electronAPI.showNativeNotification(title, body.slice(0, 500));
    return;
  }
  showDesktopNotification(title, { body: body.slice(0, 240) });
}

export function AnnouncementsSubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("announcements-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as NotifRow;
          if (row.status !== "published") return;
          if (!notificationVisibleForClient(row)) return;
          toast(row.title, { description: row.body.slice(0, 180) });
          router.refresh();
          maybeShowNative(row.title, row.body);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as NotifRow;
          const old = payload.old as Partial<NotifRow> | null;
          if (old?.status === "scheduled" && row.status === "published") {
            if (!notificationVisibleForClient(row)) return;
            toast(row.title, { description: row.body.slice(0, 180) });
            router.refresh();
            maybeShowNative(row.title, row.body);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return <>{children}</>;
}
