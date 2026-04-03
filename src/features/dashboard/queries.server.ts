import { createClient } from "@/lib/supabase/server";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export async function getDashboardSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let baseCurrency = "THB";
  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("base_currency")
      .eq("id", user.id)
      .maybeSingle();
    if (prof?.base_currency) baseCurrency = prof.base_currency;
  }

  const { data: balances, error: balErr } = await supabase
    .from("account_balances")
    .select("base_balance");

  let netWorth = 0;
  if (balances?.length) {
    for (const b of balances) {
      netWorth += Number(b.base_balance);
    }
  }

  const start = startOfMonth(new Date()).toISOString().slice(0, 10);
  const end = endOfMonth(new Date()).toISOString().slice(0, 10);

  const { data: monthTx, error: txErr } = await supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      date,
      transaction_lines(base_amount)
    `
    )
    .gte("date", start)
    .lte("date", end)
    .in("type", ["income", "expense"]);

  let income = 0;
  let expense = 0;
  if (monthTx?.length) {
    for (const t of monthTx) {
      const lines = t.transaction_lines as Array<{ base_amount: string }>;
      if (!lines?.length) continue;
      const sum = lines.reduce((s, l) => s + Number(l.base_amount), 0);
      if (t.type === "income") income += sum;
      if (t.type === "expense") expense += Math.abs(sum);
    }
  }

  const { data: recent } = await supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      description,
      date,
      categories(name),
      transaction_lines(amount, currency_code, base_amount, accounts(name))
    `
    )
    .order("date", { ascending: false })
    .limit(8);

  return {
    baseCurrency,
    netWorth,
    monthlyIncome: income,
    monthlyExpense: expense,
    monthlySavings: income - expense,
    recent: recent ?? [],
    errors: { balances: balErr, transactions: txErr },
  };
}
