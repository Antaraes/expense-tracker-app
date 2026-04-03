import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";
import type { TransactionType } from "@/types/transaction.types";

export interface CreateTransactionParams {
  type: TransactionType;
  categoryId: string | null;
  description: string | null;
  notes: string | null;
  date: string;
  lines: Array<{
    account_id: string;
    amount: number;
    currency_code: string;
    exchange_rate: number;
  }>;
}

export const transactionService = {
  async listRecent() {
    const supabase = createClient();
    return supabase
      .from("transactions")
      .select(
        "id, type, description, date, category_id, categories(name, icon, color)"
      )
      .order("date", { ascending: false })
      .limit(50);
  },

  async create(params: CreateTransactionParams) {
    const supabase = createClient();
    return supabase.rpc("create_transaction", {
      p_type: params.type,
      p_category_id: params.categoryId,
      p_description: params.description,
      p_notes: params.notes,
      p_date: params.date,
      p_lines: params.lines as unknown as Json,
    });
  },

  async remove(id: string) {
    const supabase = createClient();
    return supabase.from("transactions").delete().eq("id", id);
  },

  async update(id: string, params: CreateTransactionParams) {
    const supabase = createClient();
    return supabase.rpc("update_transaction", {
      p_transaction_id: id,
      p_type: params.type,
      p_category_id: params.categoryId,
      p_description: params.description,
      p_notes: params.notes,
      p_date: params.date,
      p_lines: params.lines as unknown as Json,
    });
  },
};
