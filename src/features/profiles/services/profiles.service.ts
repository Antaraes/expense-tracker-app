import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const profilesService = {
  async getMine(): Promise<{
    data: ProfileRow | null;
    error: Error | null;
  }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: null };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as ProfileRow, error: null };
  },

  async updateMine(
    patch: Partial<
      Pick<
        ProfileRow,
        | "default_account_id"
        | "display_name"
        | "avatar_url"
        | "base_currency"
        | "push_notifications_enabled"
        | "budget_alerts_enabled"
        | "recurring_reminders_enabled"
        | "budget_alert_threshold_pct"
      >
    >
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async wipeFinanceData(): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase.rpc("wipe_user_finance_data");
    if (error) return { error: new Error(error.message) };
    return { error: null };
  },
};
