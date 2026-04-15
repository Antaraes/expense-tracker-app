import { createClient } from "@/lib/supabase/client";

type CreateRecurringInput = {
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
};

export const recurringService = {
  async create(
    input: CreateRecurringInput
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("recurring_rules").insert({
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
      is_active: true,
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async setActive(
    id: string,
    isActive: boolean
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase
      .from("recurring_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async remove(id: string): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase.from("recurring_rules").delete().eq("id", id);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async processDue(): Promise<{
    data: number | null;
    error: Error | null;
  }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("process_my_recurring_rules");

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data ?? 0, error: null };
  },
};
