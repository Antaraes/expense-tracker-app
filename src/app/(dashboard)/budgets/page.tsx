import { redirect } from "next/navigation";
import { BudgetsClient } from "@/app/(dashboard)/budgets/budgets-client";
import { getExpenseByCategory } from "@/features/reports/queries.server";
import { createClient } from "@/lib/supabase/server";

function monthEnd(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y!, m!, 0);
  return `${y}-${String(m!).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const def = new Date();
  const defaultYm = `${def.getFullYear()}-${String(def.getMonth() + 1).padStart(2, "0")}`;
  const yearMonth = sp.month?.match(/^\d{4}-\d{2}$/) ? sp.month! : defaultYm;
  const from = `${yearMonth}-01`;
  const to = monthEnd(yearMonth);

  const [{ data: prof }, { data: budgets }, { rows: spendRows }, { data: cats }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("base_currency")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("budgets")
        .select("id, category_id, amount, categories(name)")
        .eq("year_month", yearMonth),
      getExpenseByCategory(from, to),
      supabase
        .from("categories")
        .select("id, name, type")
        .or("type.eq.expense,type.eq.both")
        .order("sort_order"),
    ]);

  const expenseCategories =
    (cats ?? []).filter((c) => c.type === "expense" || c.type === "both") ?? [];

  return (
    <BudgetsClient
      yearMonth={yearMonth}
      baseCurrency={prof?.base_currency ?? "THB"}
      budgets={budgets ?? []}
      spendRows={spendRows}
      expenseCategories={expenseCategories}
    />
  );
}
