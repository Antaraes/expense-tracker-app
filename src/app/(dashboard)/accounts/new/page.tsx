import { redirect } from "next/navigation";
import { AccountForm } from "@/features/accounts/components/account-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currencies } = await supabase
    .from("currencies")
    .select("code, name")
    .eq("is_active", true)
    .order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New account</h1>
        <p className="text-sm text-muted-foreground">
          Create a bank, wallet, cash, or credit card account in one currency.
        </p>
      </div>
      <AccountForm currencies={currencies ?? []} mode="create" />
    </div>
  );
}
