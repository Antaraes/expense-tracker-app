import { createClient } from "@/lib/supabase/server";
import { embedSingle } from "@/lib/utils";

export async function getAccountsWithBalances() {
  const supabase = await createClient();
  return supabase
    .from("account_balances")
    .select(
      "id, user_id, name, type, default_currency, balance, base_balance"
    )
    .order("name");
}

export type AccountLineRow = {
  id: string;
  amount: string;
  currency_code: string;
  base_amount: string;
  exchange_rate: string;
  transactions: unknown;
};

export async function getAccountDetail(accountId: string) {
  const supabase = await createClient();
  const { data: balanceRow, error: aErr } = await supabase
    .from("account_balances")
    .select(
      "id, user_id, name, type, default_currency, balance, base_balance"
    )
    .eq("id", accountId)
    .maybeSingle();

  let account = balanceRow;

  if (!account && !aErr) {
    const { data: raw } = await supabase
      .from("accounts")
      .select("id, user_id, name, type, default_currency")
      .eq("id", accountId)
      .maybeSingle();
    if (raw) {
      const { data: tls } = await supabase
        .from("transaction_lines")
        .select("amount, base_amount")
        .eq("account_id", accountId);
      const balance = (tls ?? []).reduce((s, l) => s + Number(l.amount), 0);
      const base_balance = (tls ?? []).reduce(
        (s, l) => s + Number(l.base_amount),
        0
      );
      account = {
        id: raw.id,
        user_id: raw.user_id,
        name: raw.name,
        type: raw.type,
        default_currency: raw.default_currency,
        balance: balance as unknown as string,
        base_balance: base_balance as unknown as string,
      };
    }
  }

  if (aErr || !account) {
    return { account: null as null, lines: [] as AccountLineRow[], error: aErr };
  }

  const { data: lines, error: lErr } = await supabase
    .from("transaction_lines")
    .select(
      `
      id,
      amount,
      currency_code,
      base_amount,
      exchange_rate,
      transactions (
        id,
        type,
        date,
        description,
        categories (name)
      )
    `
    )
    .eq("account_id", accountId)
    .limit(500);

  const sorted = [...(lines ?? [])] as AccountLineRow[];
  sorted.sort((a, b) => {
    const ta = embedSingle<{ date: string }>(a.transactions)?.date ?? "";
    const tb = embedSingle<{ date: string }>(b.transactions)?.date ?? "";
    return tb.localeCompare(ta);
  });

  return { account, lines: sorted.slice(0, 200), error: lErr };
}
