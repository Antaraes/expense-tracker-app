import { createClient } from "@/lib/supabase/client";

export const budgetsService = {
  async listForMonth(yearMonth: string) {
    const supabase = createClient();
    return supabase
      .from("budgets")
      .select("id, category_id, year_month, amount, categories(name)")
      .eq("year_month", yearMonth)
      .order("category_id");
  },

  async upsert(input: {
    category_id: string;
    year_month: string;
    amount: number;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };
    return supabase
      .from("budgets")
      .upsert(
        {
          user_id: user.id,
          category_id: input.category_id,
          year_month: input.year_month,
          amount: input.amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category_id,year_month" }
      )
      .select()
      .maybeSingle();
  },

  async remove(id: string) {
    const supabase = createClient();
    return supabase.from("budgets").delete().eq("id", id);
  },
};
