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
  total: number;
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
      categories (name),
      transaction_lines (base_amount)
    `
    )
    .eq("type", "expense")
    .gte("date", from)
    .lte("date", to);

  const map = new Map<string, { name: string; total: number }>();

  for (const t of txs ?? []) {
    const key = t.category_id ?? "__none__";
    const cat = embedSingle<{ name: string }>(t.categories);
    const name = cat?.name ?? "Uncategorized";
    const lines = t.transaction_lines as { base_amount: string }[] | null;
    const sum = Math.abs(
      (lines ?? []).reduce((s, l) => s + Number(l.base_amount), 0)
    );
    const prev = map.get(key) ?? { name, total: 0 };
    map.set(key, { name: prev.name, total: prev.total + sum });
  }

  const rows: CategoryExpenseRow[] = Array.from(map.entries())
    .map(([categoryId, v]) => ({ categoryId, name: v.name, total: v.total }))
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
