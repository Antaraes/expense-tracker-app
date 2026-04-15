import { createClient } from "@/lib/supabase/client";

export const budgetsService = {
  async upsert(input: {
    category_id: string;
    year_month: string;
    amount: number;
  }): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        category_id: input.category_id,
        year_month: input.year_month,
        amount: input.amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category_id,year_month" }
    );

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async remove(id: string): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  },
};
