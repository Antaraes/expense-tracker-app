import {
  endOfWeek,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { embedSingle } from "@/lib/utils";

export type MonthlyRow = {
  month: string;
  income: number;
  expense: number;
};

export type CategoryExpenseRow = {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
};

export type WeeklyRow = {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  income: number;
  expense: number;
};

export type CurrencyExposureRow = {
  currencyCode: string;
  totalNative: number;
};

export function monthKeys(monthsBack: number): string[] {
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}

export function monthKeysBetween(fromMonth: string, toMonth: string): string[] {
  if (fromMonth > toMonth) return [];
  const keys: string[] = [];
  let [yc, mc] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  while (yc < ty || (yc === ty && mc <= tm)) {
    keys.push(`${yc}-${String(mc).padStart(2, "0")}`);
    mc += 1;
    if (mc > 12) {
      mc = 1;
      yc += 1;
    }
  }
  return keys;
}

/** Last N calendar months (including current), income vs expense in base currency. */
export async function getMonthlyIncomeExpense(monthsBack = 6) {
  const keys = monthKeys(monthsBack);
  return getMonthlyIncomeExpenseForKeys(keys);
}

/** Inclusive month range `fromMonth`–`toMonth` as `YYYY-MM`. */
export async function getMonthlyIncomeExpenseForKeys(keys: string[]) {
  const supabase = await createClient();
  if (keys.length === 0) {
    return { rows: [] as MonthlyRow[], error: null };
  }
  const fromMonth = keys[0];
  const from = `${fromMonth}-01`;

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, type, date, transaction_lines(base_amount)")
    .in("type", ["income", "expense"])
    .gte("date", from);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const k of keys) {
    byMonth.set(k, { income: 0, expense: 0 });
  }

  for (const t of txs ?? []) {
    const m = t.date.slice(0, 7);
    const cur = byMonth.get(m);
    if (!cur) continue;
    const lines = t.transaction_lines as { base_amount: string }[] | null;
    const sum = (lines ?? []).reduce((s, l) => s + Number(l.base_amount), 0);
    if (t.type === "income") cur.income += sum;
    if (t.type === "expense") cur.expense += Math.abs(sum);
  }

  const rows: MonthlyRow[] = keys.map((month) => {
    const v = byMonth.get(month)!;
    return { month, income: v.income, expense: v.expense };
  });

  return { rows, error };
}

/** Expense totals by category for a date range (base currency). */
export async function getExpenseByCategory(from: string, to: string) {
  const supabase = await createClient();
  const { data: txs, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      category_id,
      categories (name, icon, color),
      transaction_lines (base_amount)
    `
    )
    .eq("type", "expense")
    .gte("date", from)
    .lte("date", to);

  const map = new Map<
    string,
    { name: string; icon: string | null; color: string | null; total: number }
  >();

  for (const t of txs ?? []) {
    const key = t.category_id ?? "__none__";
    const cat = embedSingle<{
      name: string;
      icon: string | null;
      color: string | null;
    }>(t.categories);
    const name = cat?.name ?? "Uncategorized";
    const icon = cat?.icon ?? null;
    const color = cat?.color ?? null;
    const lines = t.transaction_lines as { base_amount: string }[] | null;
    const sum = Math.abs(
      (lines ?? []).reduce((s, l) => s + Number(l.base_amount), 0)
    );
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { name, icon, color, total: sum });
    } else {
      map.set(key, {
        name: prev.name,
        icon: prev.icon ?? icon,
        color: prev.color ?? color,
        total: prev.total + sum,
      });
    }
  }

  const rows: CategoryExpenseRow[] = Array.from(map.entries())
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      icon: v.icon,
      color: v.color,
      total: v.total,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  return { rows, error };
}

export function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0);
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return { from: start, to: end };
}

/** Income vs expense per calendar week (Mon–Sun), base currency amounts. */
export async function getWeeklyIncomeExpense(weeksBack = 8) {
  const supabase = await createClient();
  const weeks: { from: string; to: string; label: string }[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = subWeeks(new Date(), i);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    weeks.push({
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
      label: `${format(start, "MMM d")}–${format(end, "d, yyyy")}`,
    });
  }

  if (weeks.length === 0) {
    return { rows: [] as WeeklyRow[], error: null };
  }

  const overallFrom = weeks[0].from;
  const overallTo = weeks[weeks.length - 1].to;

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, type, date, transaction_lines(base_amount)")
    .in("type", ["income", "expense"])
    .gte("date", overallFrom)
    .lte("date", overallTo);

  const rows: WeeklyRow[] = weeks.map((w) => {
    let income = 0;
    let expense = 0;
    for (const t of txs ?? []) {
      if (t.date < w.from || t.date > w.to) continue;
      const lines = t.transaction_lines as { base_amount: string }[] | null;
      const sum = (lines ?? []).reduce((s, l) => s + Number(l.base_amount), 0);
      if (t.type === "income") income += sum;
      if (t.type === "expense") expense += Math.abs(sum);
    }
    return {
      weekLabel: w.label,
      weekStart: w.from,
      weekEnd: w.to,
      income,
      expense,
    };
  });

  return { rows, error };
}

/** Sum of account native balances grouped by currency (active accounts). */
export async function getCurrencyExposure() {
  const supabase = await createClient();
  const { data: balances, error } = await supabase
    .from("account_balances")
    .select("default_currency, balance");

  const byCcy = new Map<string, number>();
  for (const b of balances ?? []) {
    const c = b.default_currency;
    byCcy.set(c, (byCcy.get(c) ?? 0) + Number(b.balance));
  }

  const rows: CurrencyExposureRow[] = Array.from(byCcy.entries())
    .map(([currencyCode, totalNative]) => ({ currencyCode, totalNative }))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

  return { rows, error };
}
