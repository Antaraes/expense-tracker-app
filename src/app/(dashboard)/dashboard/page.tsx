import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { getDashboardSummary } from "@/features/dashboard/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { rowSpotBaseSum } from "@/lib/spot-money";
import { embedSingle } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const c = summary.baseCurrency;

  return (
    <div className="animate-fade-in-up space-y-10">
      <PageHeader
        title="Dashboard"
        description={`Net worth and this month's cash flow in ${c}.`}
        actions={
          <Button asChild size="sm" className="shadow-sm">
            <Link href="/transactions/new">
              <Plus className="mr-1.5 size-4" />
              New transaction
            </Link>
          </Button>
        }
      />
      {(summary.errors.balances ||
        summary.errors.transactions ||
        summary.errors.monthly ||
        summary.errors.category ||
        summary.errors.accounts) && (
        <p className="text-sm text-destructive" role="alert">
          Some data could not be loaded. Check your connection and Supabase
          policies.
        </p>
      )}
      <div className="stagger-fade grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="surface-card border-0 shadow-black/5 dark:shadow-black/40">
          <CardHeader className="pb-2">
            <CardDescription>Net worth ({c})</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.spotNetWorth, c)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Uses native balances × latest rates from Settings ({c}).
            </p>
            <p className="text-xs font-medium text-foreground">
              Ledger (historical line base):{" "}
              <span className="font-mono tabular-nums">
                {formatCurrencyCode(summary.netWorth, c)}
              </span>
            </p>
            {summary.spotNetWorthNote ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {summary.spotNetWorthNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="surface-card border-0 shadow-black/5 dark:shadow-black/40">
          <CardHeader className="pb-2">
            <CardDescription>Income (this month)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.monthlyIncome, c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Latest FX from Settings</p>
          </CardContent>
        </Card>
        <Card className="surface-card border-0 shadow-black/5 dark:shadow-black/40">
          <CardHeader className="pb-2">
            <CardDescription>Expenses (this month)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {formatCurrencyCode(summary.monthlyExpense, c)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Latest FX from Settings</p>
          </CardContent>
        </Card>
        <Card className="surface-card border-0 shadow-black/5 dark:shadow-black/40">
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

      <DashboardOverview
        baseCurrency={c}
        monthlyChart={summary.monthlyChart}
        categoryMonth={summary.categoryMonth}
        accountBalances={summary.accountBalances}
      />

      <Card className="surface-card border-0 shadow-black/5 dark:shadow-black/40">
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
            <ul className="divide-y divide-border/80 rounded-lg border border-border/70 bg-muted/20">
              {summary.recent.map((row) => {
                const cat = embedSingle<{ name: string }>(row.categories);
                const lines = row.transaction_lines as unknown as Array<{
                  base_amount: string;
                  amount: string;
                  currency_code: string;
                  accounts: { name: string } | null;
                }>;
                const baseSum = rowSpotBaseSum(lines, c, summary.ratesToBaseToday);
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
