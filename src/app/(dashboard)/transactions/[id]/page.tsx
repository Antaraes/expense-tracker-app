import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionDeleteButton } from "@/features/transactions/components/transaction-delete-button";
import { getTransactionById } from "@/features/transactions/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { embedSingle } from "@/lib/utils";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: row, error } = await getTransactionById(id);
  if (error || !row) {
    notFound();
  }

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

  const cat = embedSingle<{
    name: string;
    icon: string | null;
    color: string | null;
  }>(row.categories);
  const lines = row.transaction_lines as unknown as Array<{
    id: string;
    amount: string;
    currency_code: string;
    base_amount: string;
    exchange_rate: string;
    accounts: { id: string; name: string; default_currency: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Transaction
            </h1>
            <Badge variant="outline" className="capitalize">
              {row.type}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground tabular-nums">
            {row.date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/transactions">Back to list</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/transactions/${row.id}/edit`}>Edit</Link>
          </Button>
          <TransactionDeleteButton id={row.id} />
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>{row.description || "No description"}</CardTitle>
          <CardDescription>
            {cat?.name ? `Category: ${cat.name}` : "No category"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {row.notes ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">{row.notes}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Lines ({baseCurrency} base)
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {lines.map((line) => {
                const acc = embedSingle<{
                  id: string;
                  name: string;
                  default_currency: string;
                }>(line.accounts);
                const baseAmt = Number(line.base_amount);
                return (
                  <li
                    key={line.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{acc?.name ?? "Account"}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.currency_code} · rate {line.exchange_rate}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div>
                        {line.amount} {line.currency_code}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrencyCode(baseAmt, baseCurrency)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
