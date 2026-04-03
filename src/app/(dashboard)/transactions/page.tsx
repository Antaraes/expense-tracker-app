import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/features/transactions/components/transactions-table";
import { getTransactionsList } from "@/features/transactions/queries.server";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
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

  const { data: rows, error } = await getTransactionsList(500);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Ledger entries in {baseCurrency}.
          </p>
        </div>
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Ledger entries in {baseCurrency}.
            </p>
          </div>
          <Button asChild>
            <Link href="/transactions/new">New transaction</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          No transactions yet.{" "}
          <Link
            href="/transactions/new"
            className="text-primary underline underline-offset-4"
          >
            Create your first
          </Link>
          .
        </p>
      </div>
    );
  }

  return <TransactionsTable rows={rows} baseCurrency={baseCurrency} />;
}
