import { createClient } from "@/lib/supabase/server";

async function latestFxToBase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromCurrency: string,
  baseCurrency: string,
  onDate: string
): Promise<number | null> {
  if (fromCurrency === baseCurrency) return 1;
  const { data: direct } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", baseCurrency)
    .lte("effective_date", onDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (direct?.rate != null && Number(direct.rate) > 0) {
    return Number(direct.rate);
  }
  const { data: inv } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", baseCurrency)
    .eq("to_currency", fromCurrency)
    .lte("effective_date", onDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inv?.rate != null && Number(inv.rate) > 0) {
    return 1 / Number(inv.rate);
  }
  return null;
}

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
    .select("base_balance, balance, default_currency");

  let netWorth = 0;
  if (balances?.length) {
    for (const b of balances) {
      netWorth += Number(b.base_balance);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  let spotNetWorth = 0;
  let spotUsedFallback = false;
  if (balances?.length) {
    for (const b of balances) {
      const native = Number(b.balance);
      const baseStored = Number(b.base_balance);
      if (b.default_currency === baseCurrency) {
        spotNetWorth += native;
        continue;
      }
      const rate = await latestFxToBase(
        supabase,
        b.default_currency,
        baseCurrency,
        today
      );
      if (rate != null) {
        spotNetWorth += native * rate;
      } else {
        spotNetWorth += baseStored;
        spotUsedFallback = true;
      }
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
    spotNetWorth,
    spotNetWorthNote: spotUsedFallback
      ? "Some accounts used ledger base balances where a same-day FX pair was missing."
      : null,
    monthlyIncome: income,
    monthlyExpense: expense,
    monthlySavings: income - expense,
    recent: recent ?? [],
    errors: { balances: balErr, transactions: txErr },
  };
}
