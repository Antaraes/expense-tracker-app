import { createClient } from "@/lib/supabase/client";

type AccountType = "bank" | "e_wallet" | "cash" | "credit_card";

export const accountService = {
  async archive(accountId: string): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase
      .from("accounts")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async create(input: {
    name: string;
    type: AccountType;
    default_currency: string;
    icon: string | null;
    color: string | null;
  }): Promise<{ data: { id: string } | null; error: Error | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: input.name,
        type: input.type,
        default_currency: input.default_currency,
        icon: input.icon,
        color: input.color,
        sort_order: 0,
        is_archived: false,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: { id: data.id }, error: null };
  },

  async update(
    accountId: string,
    input: {
      name: string;
      type: AccountType;
      default_currency: string;
      icon: string | null;
      color: string | null;
    }
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase
      .from("accounts")
      .update({
        name: input.name,
        type: input.type,
        default_currency: input.default_currency,
        icon: input.icon,
        color: input.color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },
};
