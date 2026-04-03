import { redirect } from "next/navigation";
import { BudgetsClient } from "@/app/(dashboard)/budgets/budgets-client";
import { getExpenseByCategory } from "@/features/reports/queries.server";
import { createClient } from "@/lib/supabase/server";

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return { from: "", to: "" };
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(last).padStart(2, "0")}`,
  };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const ym =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month)
      ? sp.month
      : new Date().toISOString().slice(0, 7);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("id", user.id)
    .maybeSingle();

  const baseCurrency = profile?.base_currency ?? "THB";

  const { from, to } = monthBounds(ym);
  const { rows: spendRows } = await getExpenseByCategory(from, to);

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, category_id, amount, categories(name)")
    .eq("year_month", ym)
    .order("category_id");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .or("type.eq.expense,type.eq.both")
    .order("name");

  const expenseCategories = (categories ?? []).filter(
    (c) => c.type === "expense" || c.type === "both"
  );

  return (
    <BudgetsClient
      yearMonth={ym}
      baseCurrency={baseCurrency}
      budgets={budgets}
      spendRows={spendRows}
      expenseCategories={expenseCategories}
    />
  );
}
