import Link from "next/link";
import { notFound } from "next/navigation";
import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";
import { parseTransactionForForm } from "@/features/transactions/lib/parse-transaction-for-form";
import { getEditTransactionPageData } from "@/features/transactions/queries.server";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEditTransactionPageData(id);
  if (!data) {
    notFound();
  }

  const baseCurrency = data.profile?.base_currency ?? "THB";
  const initial = parseTransactionForForm(data.transaction);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit transaction
          </h1>
          <p className="text-sm text-muted-foreground">
            Updates replace ledger lines atomically via{" "}
            <code className="text-xs">update_transaction</code>.
          </p>
        </div>
        <Link
          href={`/transactions/${id}`}
          className="text-sm text-primary underline underline-offset-4"
        >
          View transaction
        </Link>
      </div>
      <NewTransactionForm
        key={id}
        accounts={data.accounts}
        categories={data.categories}
        baseCurrency={baseCurrency}
        defaultAccountId={data.profile?.default_account_id ?? null}
        editTransactionId={id}
        initial={initial}
      />
    </div>
  );
}
