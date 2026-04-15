import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountsWithBalances } from "@/features/accounts/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts, error } = await getAccountsWithBalances();
  const { data: prof } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("id", user.id)
    .maybeSingle();
  const baseCurrency = prof?.base_currency ?? "THB";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Balances from ledger lines · base reporting in {baseCurrency}
          </p>
        </div>
        <Link
          href="/accounts/new"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          New account
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : !accounts?.length ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet.{" "}
          <Link href="/accounts/new" className="text-primary underline underline-offset-4">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {accounts.map((a) => (
            <li key={a.id}>
              <Link
                href={`/accounts/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {a.type} · {a.default_currency}
                  </p>
                </div>
                <div className="text-right font-mono text-sm tabular-nums">
                  <div>{formatCurrencyCode(Number(a.balance), a.default_currency)}</div>
                  <div className="text-xs text-muted-foreground">
                    {baseCurrency}{" "}
                    {formatCurrencyCode(Number(a.base_balance), baseCurrency)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
