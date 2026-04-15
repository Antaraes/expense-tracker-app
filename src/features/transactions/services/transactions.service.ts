import { createClient } from "@/lib/supabase/client";

type LineInput = {
  account_id: string;
  amount: number;
  currency_code: string;
  exchange_rate: number;
};

export const transactionService = {
  async remove(id: string): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async create(params: {
    type: "expense" | "income" | "transfer";
    categoryId: string | null;
    description: string | null;
    notes: string | null;
    date: string;
    lines: LineInput[];
  }): Promise<{ data: string | null; error: Error | null }> {
    const supabase = createClient();
    const payload = params.lines.map((l) => ({
      account_id: l.account_id,
      amount: l.amount,
      currency_code: l.currency_code,
      exchange_rate: l.exchange_rate,
    }));

    const { data, error } = await supabase.rpc("create_transaction", {
      p_type: params.type,
      p_category_id: params.categoryId,
      p_description: params.description,
      p_notes: params.notes,
      p_date: params.date,
      p_lines: payload,
    });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as string, error: null };
  },

  async update(
    transactionId: string,
    params: {
      type: "expense" | "income" | "transfer";
      categoryId: string | null;
      description: string | null;
      notes: string | null;
      date: string;
      lines: LineInput[];
    }
  ): Promise<{ data: string | null; error: Error | null }> {
    const supabase = createClient();
    const payload = params.lines.map((l) => ({
      account_id: l.account_id,
      amount: l.amount,
      currency_code: l.currency_code,
      exchange_rate: l.exchange_rate,
    }));

    const { data, error } = await supabase.rpc("update_transaction", {
      p_transaction_id: transactionId,
      p_type: params.type,
      p_category_id: params.categoryId,
      p_description: params.description,
      p_notes: params.notes,
      p_date: params.date,
      p_lines: payload,
    });

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as string, error: null };
  },
};
