import { createClient } from "@/lib/supabase/client";

export const profilesService = {
  async getMine() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };
    return supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  },

  async updateMine(partial: {
    display_name?: string | null;
    base_currency?: string;
    default_account_id?: string | null;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };
    return supabase
      .from("profiles")
      .update({
        ...partial,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .maybeSingle();
  },
};
