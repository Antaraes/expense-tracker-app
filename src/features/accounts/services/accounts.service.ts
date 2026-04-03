import { createClient } from "@/lib/supabase/client";

export type AccountType = "bank" | "e_wallet" | "cash" | "credit_card";

export const accountService = {
  async list() {
    const supabase = createClient();
    return supabase
      .from("accounts")
      .select("*")
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });
  },

  async listIncludingArchived() {
    const supabase = createClient();
    return supabase
      .from("accounts")
      .select("*")
      .order("sort_order", { ascending: true });
  },

  async create(input: {
    name: string;
    type: AccountType;
    default_currency: string;
    icon?: string | null;
    color?: string | null;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };

    const { data: last } = await supabase
      .from("accounts")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (last?.sort_order ?? 0) + 1;

    return supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: input.name.trim(),
        type: input.type,
        default_currency: input.default_currency,
        icon: input.icon ?? null,
        color: input.color ?? null,
        is_archived: false,
        sort_order,
      })
      .select()
      .maybeSingle();
  },

  async update(
    id: string,
    input: Partial<{
      name: string;
      type: AccountType;
      default_currency: string;
      icon: string | null;
      color: string | null;
      sort_order: number;
    }>
  ) {
    const supabase = createClient();
    return supabase
      .from("accounts")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();
  },

  async archive(id: string) {
    const supabase = createClient();
    return supabase
      .from("accounts")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();
  },
};
