import { redirect } from "next/navigation";
import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";
import { getNewTransactionPageData } from "@/features/transactions/queries.server";

export default async function NewTransactionPage() {
  const data = await getNewTransactionPageData();
  if (!data) {
    redirect("/login");
  }

  const baseCurrency = data.profile?.base_currency ?? "THB";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New transaction
        </h1>
        <p className="text-sm text-muted-foreground">
          Record an expense, income, or transfer (balanced in base currency).
        </p>
      </div>
      <NewTransactionForm
        accounts={data.accounts}
        categories={data.categories}
        baseCurrency={baseCurrency}
        defaultAccountId={data.profile?.default_account_id ?? null}
      />
    </div>
  );
}
