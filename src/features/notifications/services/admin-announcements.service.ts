import { createClient } from "@/lib/supabase/client";

export type CreateAnnouncementInput = {
  title: string;
  body: string;
  type: "release" | "maintenance" | "alert" | "feature" | "info";
  priority: "low" | "normal" | "high" | "critical";
  targetPlatform: string[];
  targetMinVersion: string;
  targetMaxVersion: string;
  actionUrl: string;
  actionLabel: string;
  scheduledAt: string | null;
  expiresAt: string | null;
  isDismissible: boolean;
  showAsBanner: boolean;
};

export type UpdateAnnouncementInput = CreateAnnouncementInput & {
  id: string;
};

type EngagementRow = {
  notification_id: string;
  read_count: number;
  dismiss_count: number;
};

export const adminAnnouncementsService = {
  async listWithStats(): Promise<{
    data: Array<{
      read_count: number;
      dismiss_count: number;
      [key: string]: unknown;
    }>;
    error: Error | null;
  }> {
    const supabase = createClient();
    const [{ data: rows, error }, { data: stats, error: statsErr }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_notification_engagement_stats"),
      ]);

    if (error) return { data: [], error: new Error(error.message) };
    if (statsErr) return { data: [], error: new Error(statsErr.message) };

    const statMap = new Map<string, EngagementRow>();
    for (const s of (stats ?? []) as EngagementRow[]) {
      statMap.set(s.notification_id, s);
    }

    const merged = (rows ?? []).map((n) => {
      const st = statMap.get(n.id as string);
      return {
        ...n,
        read_count: st?.read_count ?? 0,
        dismiss_count: st?.dismiss_count ?? 0,
      };
    });

    return { data: merged, error: null };
  },

  async listAll() {
    const supabase = createClient();
    return supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
  },

  async getById(id: string) {
    const supabase = createClient();
    return supabase.from("notifications").select("*").eq("id", id).maybeSingle();
  },

  async create(input: CreateAnnouncementInput) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };

    const status = input.scheduledAt ? "scheduled" : "published";
    const now = new Date().toISOString();
    const published_at = status === "published" ? now : null;

    return supabase
      .from("notifications")
      .insert({
        title: input.title.trim(),
        body: input.body.trim(),
        type: input.type,
        priority: input.priority,
        target_platform:
          input.targetPlatform.length > 0 ? input.targetPlatform : ["all"],
        target_min_version: input.targetMinVersion.trim() || null,
        target_max_version: input.targetMaxVersion.trim() || null,
        action_url: input.actionUrl.trim() || null,
        action_label: input.actionLabel.trim() || null,
        scheduled_at: input.scheduledAt || null,
        expires_at: input.expiresAt || null,
        is_dismissible: input.isDismissible,
        show_as_banner: input.showAsBanner,
        status,
        published_at,
        created_by: user.id,
      })
      .select()
      .maybeSingle();
  },

  async update(input: UpdateAnnouncementInput) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };

    const now = new Date().toISOString();
    const wantScheduled = !!input.scheduledAt;
    const status = wantScheduled ? "scheduled" : "published";

    const { data: existing } = await supabase
      .from("notifications")
      .select("published_at")
      .eq("id", input.id)
      .maybeSingle();

    const prev = existing as { published_at: string | null } | null;
    const published_at = wantScheduled
      ? null
      : (prev?.published_at ?? now);

    return supabase
      .from("notifications")
      .update({
        title: input.title.trim(),
        body: input.body.trim(),
        type: input.type,
        priority: input.priority,
        target_platform:
          input.targetPlatform.length > 0 ? input.targetPlatform : ["all"],
        target_min_version: input.targetMinVersion.trim() || null,
        target_max_version: input.targetMaxVersion.trim() || null,
        action_url: input.actionUrl.trim() || null,
        action_label: input.actionLabel.trim() || null,
        scheduled_at: input.scheduledAt || null,
        expires_at: input.expiresAt || null,
        is_dismissible: input.isDismissible,
        show_as_banner: input.showAsBanner,
        status,
        published_at,
        updated_at: now,
      })
      .eq("id", input.id)
      .select()
      .maybeSingle();
  },

  async duplicate(id: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };

    const { data: row, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !row) {
      return { data: null, error: error ?? new Error("Not found") };
    }

    const r = row as Record<string, unknown>;
    const title = `Copy: ${String(r.title)}`;

    return supabase
      .from("notifications")
      .insert({
        title,
        body: r.body,
        type: r.type,
        priority: r.priority,
        target_platform: r.target_platform,
        target_min_version: r.target_min_version,
        target_max_version: r.target_max_version,
        action_url: r.action_url,
        action_label: r.action_label,
        scheduled_at: null,
        expires_at: null,
        is_dismissible: r.is_dismissible,
        show_as_banner: r.show_as_banner,
        status: "draft",
        published_at: null,
        created_by: user.id,
      })
      .select()
      .maybeSingle();
  },

  async delete(id: string) {
    const supabase = createClient();
    return supabase.from("notifications").delete().eq("id", id);
  },
};
