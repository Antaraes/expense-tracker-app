import { createClient } from "@/lib/supabase/server";

/** Nested FK embeds from PostgREST may be object or single-element array depending on typings. */
export type TransactionRow = {
  id: string;
  type: string;
  description: string | null;
  date: string;
  category_id: string | null;
  categories: unknown;
  transaction_lines: Array<{
    id: string;
    amount: string;
    currency_code: string;
    base_amount: string;
    exchange_rate: string;
    accounts: unknown;
  }>;
};

export async function getTransactionsList(limit = 100) {
  const supabase = await createClient();
  return supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      description,
      date,
      category_id,
      categories(name, icon, color),
      transaction_lines(
        id,
        amount,
        currency_code,
        base_amount,
        exchange_rate,
        accounts(name, default_currency)
      )
    `
    )
    .order("date", { ascending: false })
    .limit(limit);
}

export async function getTransactionById(id: string) {
  const supabase = await createClient();
  return supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      description,
      notes,
      date,
      category_id,
      categories(name, icon, color),
      transaction_lines(
        id,
        amount,
        currency_code,
        base_amount,
        exchange_rate,
        accounts(id, name, default_currency)
      )
    `
    )
    .eq("id", id)
    .maybeSingle();
}

export async function getNewTransactionPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [accounts, categories, profile] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, default_currency")
      .eq("is_archived", false)
      .order("sort_order"),
    supabase.from("categories").select("id, name, type, icon, color").order("sort_order"),
    supabase
      .from("profiles")
      .select("base_currency, default_account_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return {
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    profile: profile.data,
  };
}

export async function getEditTransactionPageData(transactionId: string) {
  const base = await getNewTransactionPageData();
  if (!base) return null;
  const { data: tx, error } = await getTransactionById(transactionId);
  if (error || !tx) return null;
  return { ...base, transaction: tx };
}
