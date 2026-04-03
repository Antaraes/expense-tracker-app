import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountArchiveButton } from "@/features/accounts/components/account-archive-button";
import { AccountForm } from "@/features/accounts/components/account-form";
import { getAccountDetail } from "@/features/accounts/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { embedSingle } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { account, lines, error } = await getAccountDetail(id);
  if (error || !account) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let baseCurrency = "THB";
  let defaultAccountId: string | null = null;
  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("base_currency, default_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (prof?.base_currency) baseCurrency = prof.base_currency;
    defaultAccountId = prof?.default_account_id ?? null;
  }

  const [{ data: accountRow }, { data: currencies }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).maybeSingle(),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {account.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {account.default_currency} account · balances from ledger lines
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accounts"
            className="text-sm text-primary underline underline-offset-4"
          >
            All accounts
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">
            Balance ({account.default_currency})
          </p>
          <p className="font-mono text-xl tabular-nums">
            {Number(account.balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            {account.default_currency}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Base ({baseCurrency})</p>
          <p className="font-mono text-xl tabular-nums">
            {formatCurrencyCode(Number(account.base_balance), baseCurrency)}
          </p>
        </div>
      </div>

      {accountRow && currencies?.length ? (
        <AccountForm
          mode="edit"
          accountId={id}
          currencies={currencies}
          initial={{
            name: accountRow.name,
            type: accountRow.type,
            default_currency: accountRow.default_currency,
            icon: accountRow.icon,
            color: accountRow.color,
          }}
        />
      ) : null}

      <AccountArchiveButton
        accountId={id}
        defaultAccountId={defaultAccountId}
      />

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Recent activity</h2>
        <p className="text-sm text-muted-foreground">
          Lines involving this account (newest first).
        </p>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {lines.map((line) => {
              const tx = embedSingle<{
                id: string;
                type: string;
                date: string;
                description: string | null;
                categories: unknown;
              }>(line.transactions);
              const cat = embedSingle<{ name: string }>(tx?.categories);
              if (!tx) return null;
              return (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="text-muted-foreground tabular-nums">
                      {tx.date}
                    </span>
                    <p className="truncate capitalize">{tx.type}</p>
                    <p className="truncate">
                      {tx.description || "—"}
                      {cat?.name ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {cat.name}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-sm tabular-nums">
                    <div>
                      {line.amount} {line.currency_code}
                    </div>
                    <div className="text-muted-foreground">
                      {formatCurrencyCode(
                        Number(line.base_amount),
                        baseCurrency
                      )}
                    </div>
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-xs text-primary underline underline-offset-4"
                    >
                      View transaction
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
