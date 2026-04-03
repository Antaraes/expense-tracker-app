import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTransactionsList, type TransactionRow } from "@/features/transactions/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { embedSingle } from "@/lib/utils";

function rowBaseSum(row: TransactionRow): number {
  const lines = row.transaction_lines ?? [];
  return lines.reduce((s, l) => s + Number(l.base_amount), 0);
}

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

  const { data: rows, error } = await getTransactionsList(200);

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

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : !rows?.length ? (
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
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => {
            const cat = embedSingle<{ name: string }>(row.categories);
            const baseSum = rowBaseSum(row);
            return (
              <li key={row.id}>
                <Link
                  href={`/transactions/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {row.type}
                      </Badge>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {row.date}
                      </span>
                    </div>
                    <p className="truncate font-medium">
                      {row.description || "—"}
                    </p>
                    {cat?.name ? (
                      <p className="text-xs text-muted-foreground">{cat.name}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    {row.type === "transfer" ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <span className="font-mono text-sm tabular-nums">
                        {formatCurrencyCode(baseSum, baseCurrency)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
