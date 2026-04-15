import { buildRatesToBaseMap } from "@/features/currencies/server/fx-latest";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthRange,
  getExpenseByCategory,
  getMonthlyIncomeExpense,
} from "@/features/reports/queries.server";
import type {
  CategoryExpenseRow,
  MonthlyRow,
} from "@/features/reports/queries.server";
import { rowSpotBaseSum } from "@/lib/spot-money";

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

  const start = startOfMonth(new Date()).toISOString().slice(0, 10);
  const end = endOfMonth(new Date()).toISOString().slice(0, 10);

  const { data: monthTx, error: txErr } = await supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      date,
      transaction_lines(amount, currency_code, base_amount)
    `
    )
    .gte("date", start)
    .lte("date", end)
    .in("type", ["income", "expense"]);

  const monthRange = currentMonthRange();
  const [{ rows: monthlyBars, error: monthlyErr }, catBlock, recentRes, accountsRes] =
    await Promise.all([
      getMonthlyIncomeExpense(6),
      getExpenseByCategory(monthRange.from, monthRange.to),
      supabase
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
        .limit(8),
      supabase
        .from("account_balances")
        .select("id, name, default_currency, balance, base_balance")
        .order("name"),
    ]);

  const currencyCodes = new Set<string>();
  currencyCodes.add(baseCurrency);
  for (const b of balances ?? []) {
    currencyCodes.add(b.default_currency);
  }
  for (const t of monthTx ?? []) {
    const lines = t.transaction_lines as Array<{ currency_code: string }>;
    for (const l of lines ?? []) currencyCodes.add(l.currency_code);
  }
  for (const r of recentRes.data ?? []) {
    const lines = r.transaction_lines as Array<{ currency_code: string }>;
    for (const l of lines ?? []) currencyCodes.add(l.currency_code);
  }
  for (const a of accountsRes.data ?? []) {
    currencyCodes.add(a.default_currency);
  }

  const ratesToBaseToday = await buildRatesToBaseMap(
    supabase,
    baseCurrency,
    [...currencyCodes],
    today
  );

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
      const m = ratesToBaseToday[b.default_currency];
      if (m != null && m > 0) {
        spotNetWorth += native * m;
      } else {
        spotNetWorth += baseStored;
        spotUsedFallback = true;
      }
    }
  }

  let income = 0;
  let expense = 0;
  if (monthTx?.length) {
    for (const t of monthTx) {
      const lines = t.transaction_lines as Array<{
        amount: string;
        currency_code: string;
        base_amount: string;
      }>;
      if (!lines?.length) continue;
      const sum = rowSpotBaseSum(lines, baseCurrency, ratesToBaseToday);
      if (t.type === "income") income += sum;
      if (t.type === "expense") expense += Math.abs(sum);
    }
  }

  const categoryMonth: CategoryExpenseRow[] = catBlock.rows;
  const monthlyChart: MonthlyRow[] = monthlyBars;

  const accountRows = accountsRes.data ?? [];
  const accountBalances = accountRows.map((a) => {
    const nat = Number(a.balance);
    const leg = Number(a.base_balance);
    let spot = nat;
    if (a.default_currency !== baseCurrency) {
      const m = ratesToBaseToday[a.default_currency];
      spot = m != null && m > 0 ? nat * m : leg;
    }
    return {
      ...a,
      spot_base_balance: String(spot),
    };
  });

  return {
    baseCurrency,
    netWorth,
    spotNetWorth,
    ratesToBaseToday,
    spotNetWorthNote: spotUsedFallback
      ? "Some accounts used ledger base where no FX pair was found in Settings — add or fetch rates."
      : null,
    monthlyIncome: income,
    monthlyExpense: expense,
    monthlySavings: income - expense,
    recent: recentRes.data ?? [],
    monthlyChart,
    categoryMonth,
    accountBalances,
    errors: {
      balances: balErr,
      transactions: txErr,
      monthly: monthlyErr,
      category: catBlock.error,
      accounts: accountsRes.error,
    },
  };
}
