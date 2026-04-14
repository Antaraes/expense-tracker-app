import { createClient } from "@/lib/supabase/client";
import {
  defaultAppVersion,
  notificationVisibleForClient,
} from "@/features/notifications/lib/targeting";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  action_url: string | null;
  action_label: string | null;
  target_platform: string[] | null;
  target_min_version: string | null;
  target_max_version: string | null;
  show_as_banner: boolean;
  is_dismissible: boolean;
  status: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

async function fetchReadAndDismissedIds(userId: string) {
  const supabase = createClient();
  const [reads, dismiss] = await Promise.all([
    supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId),
    supabase
      .from("notification_dismissals")
      .select("notification_id")
      .eq("user_id", userId),
  ]);
  return {
    read: new Set(
      (reads.data ?? []).map((r) => r.notification_id as string)
    ),
    dismissed: new Set(
      (dismiss.data ?? []).map((r) => r.notification_id as string)
    ),
  };
}

export const announcementsService = {
  async listForBell(): Promise<{
    data: Array<AnnouncementRow & { isRead: boolean }>;
    error: Error | null;
  }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("status", "published")
      .or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
      )
      .order("published_at", { ascending: false })
      .limit(40);

    if (error) return { data: [], error: new Error(error.message) };

    const { read, dismissed } = await fetchReadAndDismissedIds(user.id);
    const ver = defaultAppVersion();

    const rows = (data ?? [] as AnnouncementRow[])
      .filter(
        (n) =>
          !dismissed.has(n.id) &&
          notificationVisibleForClient(n, ver)
      )
      .map((n) => ({ ...n, isRead: read.has(n.id) }));

    return { data: rows, error: null };
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await this.listForBell();
    return data.filter((r) => !r.isRead).length;
  },

  async getBannerCandidate(): Promise<AnnouncementRow | null> {
    const { data } = await this.listForBell();
    const banners = data.filter((r) => r.show_as_banner && !r.isRead);
    if (banners.length === 0) return null;
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 } as const;
    banners.sort((a, b) => {
      const pa =
        priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pb =
        priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (pa !== pb) return pa - pb;
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    });
    return banners[0] ?? null;
  },

  async markAsRead(notificationId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("notification_reads").insert({
      notification_id: notificationId,
      user_id: user.id,
    });
    if (error?.code === "23505") return { error: null };
    return { error: error ? new Error(error.message) : null };
  },

  async markAllRead(notificationIds: string[]) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || notificationIds.length === 0)
      return { error: null as Error | null };
    for (const id of notificationIds) {
      const { error } = await supabase.from("notification_reads").insert({
        notification_id: id,
        user_id: user.id,
      });
      if (error && error.code !== "23505") {
        return { error: new Error(error.message) };
      }
    }
    return { error: null };
  },

  async dismiss(notificationId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("notification_dismissals").insert({
      notification_id: notificationId,
      user_id: user.id,
    });
    if (error?.code === "23505") return { error: null };
    return { error: error ? new Error(error.message) : null };
  },
};
