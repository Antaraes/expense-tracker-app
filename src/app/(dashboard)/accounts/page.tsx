import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccountsWithBalances } from "@/features/accounts/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
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

  const { data: rows, error } = await getAccountsWithBalances();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Balances from ledger lines; base column is in {baseCurrency}.
          </p>
        </div>
        <Button asChild>
          <Link href="/accounts/new">New account</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Create one in Settings or seed demo data.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((a) => (
            <Card key={a.id} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{a.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {a.type} · {a.default_currency}
                    </CardDescription>
                  </div>
                  <Link
                    href={`/accounts/${a.id}`}
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    Details
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 font-mono text-sm tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">In account ccy</span>
                  <span>
                    {Number(a.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{" "}
                    {a.default_currency}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">In base</span>
                  <span>
                    {formatCurrencyCode(Number(a.base_balance), baseCurrency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
