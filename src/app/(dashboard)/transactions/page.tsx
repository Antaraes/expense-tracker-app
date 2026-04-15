import Link from "next/link";
import { redirect } from "next/navigation";
import { TransactionsTable } from "@/features/transactions/components/transactions-table";
import { PageHeader } from "@/components/layout/page-header";
import { getTransactionsList } from "@/features/transactions/queries.server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows, error }, { data: prof }] = await Promise.all([
    getTransactionsList(500),
    supabase
      .from("profiles")
      .select("base_currency")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const baseCurrency = prof?.base_currency ?? "THB";

  return (
    <div className="animate-fade-in-up space-y-8">
      <PageHeader
        title="Transactions"
        description={`Your ledger in base currency (${baseCurrency}). Search, filter, and export.`}
        actions={
          <Button asChild size="sm" className="shadow-sm">
            <Link href="/transactions/new">
              <Plus className="mr-1.5 size-4" />
              New
            </Link>
          </Button>
        }
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : (
        <TransactionsTable
          rows={rows ?? []}
          baseCurrency={baseCurrency}
          showHeading={false}
        />
      )}
      <p className="text-center text-xs text-muted-foreground">
        <Link
          href="/dashboard"
          className="text-primary underline underline-offset-4"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
