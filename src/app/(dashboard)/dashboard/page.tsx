import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardSummary } from "@/features/dashboard/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { embedSingle } from "@/lib/utils";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const c = summary.baseCurrency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Net worth and this month&apos;s cash flow in {c}.
        </p>
      </div>
      {(summary.errors.balances || summary.errors.transactions) && (
        <p className="text-sm text-destructive" role="alert">
          Some data could not be loaded. Check your connection and Supabase
          policies.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Net worth (ledger)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.netWorth, c)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Sum of historical base amounts on each line ({c}).
            </p>
            <p className="text-xs font-medium text-foreground">
              Latest FX mark:{" "}
              <span className="font-mono tabular-nums">
                {formatCurrencyCode(summary.spotNetWorth, c)}
              </span>
            </p>
            {summary.spotNetWorthNote ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {summary.spotNetWorthNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Income (this month)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.monthlyIncome, c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From ledger lines</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Expenses (this month)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.monthlyExpense, c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Absolute base amounts</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Savings (this month)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.monthlySavings, c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Income − expenses</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.{" "}
              <Link
                href="/transactions/new"
                className="text-primary underline underline-offset-4"
              >
                Add one
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {summary.recent.map((row) => {
                const cat = embedSingle<{ name: string }>(row.categories);
                const lines = row.transaction_lines as unknown as Array<{
                  base_amount: string;
                  amount: string;
                  currency_code: string;
                  accounts: { name: string } | null;
                }>;
                const baseSum = lines?.length
                  ? lines.reduce((s, l) => s + Number(l.base_amount), 0)
                  : 0;
                return (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {row.type}
                        </Badge>
                        <span className="text-muted-foreground tabular-nums">
                          {row.date}
                        </span>
                      </div>
                      <p className="truncate font-medium">
                        {row.description || "—"}
                      </p>
                      {cat?.name ? (
                        <p className="text-xs text-muted-foreground">
                          {cat.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      {row.type === "transfer" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="font-mono tabular-nums">
                          {formatCurrencyCode(baseSum, c)}
                        </span>
                      )}
                      <Link
                        href={`/transactions/${row.id}`}
                        className="ml-3 text-primary underline underline-offset-4"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
