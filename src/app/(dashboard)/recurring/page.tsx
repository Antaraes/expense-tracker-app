import { redirect } from "next/navigation";
import { RecurringClient } from "@/app/(dashboard)/recurring/recurring-client";
import { getRecurringPageData } from "@/features/recurring/queries.server";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { profile, rules, accounts, categories } = await getRecurringPageData(
    user.id
  );

  return (
    <RecurringClient
      rules={rules}
      accounts={accounts}
      categories={categories}
      baseCurrency={profile?.base_currency ?? "THB"}
    />
  );
}
