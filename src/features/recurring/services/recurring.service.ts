import { createClient } from "@/lib/supabase/client";

export const recurringService = {
  async list() {
    const supabase = createClient();
    return supabase
      .from("recurring_rules")
      .select(
        `
        *,
        categories(name),
        accounts(name, default_currency)
      `
      )
      .order("next_run_date");
  },

  async create(input: {
    frequency: "daily" | "weekly" | "monthly";
    interval_n: number;
    next_run_date: string;
    end_date: string | null;
    type: "expense" | "income";
    category_id: string;
    description: string | null;
    account_id: string;
    amount: number;
    currency_code: string;
    exchange_rate: number;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };
    return supabase
      .from("recurring_rules")
      .insert({
        user_id: user.id,
        frequency: input.frequency,
        interval_n: input.interval_n,
        next_run_date: input.next_run_date,
        end_date: input.end_date,
        type: input.type,
        category_id: input.category_id,
        description: input.description,
        account_id: input.account_id,
        amount: input.amount,
        currency_code: input.currency_code,
        exchange_rate: input.exchange_rate,
      })
      .select()
      .maybeSingle();
  },

  async setActive(id: string, is_active: boolean) {
    const supabase = createClient();
    return supabase
      .from("recurring_rules")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
  },

  async remove(id: string) {
    const supabase = createClient();
    return supabase.from("recurring_rules").delete().eq("id", id);
  },

  async processDue() {
    const supabase = createClient();
    return supabase.rpc("process_my_recurring_rules");
  },
};
