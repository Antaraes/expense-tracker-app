import { redirect } from "next/navigation";
import { RecurringClient } from "@/app/(dashboard)/recurring/recurring-client";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rules }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("base_currency")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("recurring_rules")
        .select(
          `
          id,
          frequency,
          interval_n,
          next_run_date,
          end_date,
          type,
          description,
          amount,
          is_active,
          categories(name),
          accounts(name)
        `
        )
        .order("next_run_date", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, name, default_currency")
        .eq("is_archived", false)
        .order("sort_order"),
      supabase.from("categories").select("id, name, type").order("sort_order"),
    ]);

  return (
    <RecurringClient
      rules={rules ?? []}
      accounts={accounts ?? []}
      categories={categories ?? []}
      baseCurrency={profile?.base_currency ?? "THB"}
    />
  );
}
