"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryReportChart } from "@/features/reports/components/category-report-chart";
import { MonthlyReportCharts } from "@/features/reports/components/monthly-report-charts";
import type { CategoryExpenseRow, MonthlyRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

export type AccountBalanceStripRow = {
  id: string;
  name: string;
  default_currency: string;
  balance: string;
  base_balance: string;
};

export function DashboardOverview({
  baseCurrency,
  monthlyChart,
  categoryMonth,
  accountBalances,
}: {
  baseCurrency: string;
  monthlyChart: MonthlyRow[];
  categoryMonth: CategoryExpenseRow[];
  accountBalances: AccountBalanceStripRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Income vs expenses</CardTitle>
            <CardDescription>Last six calendar months ({baseCurrency})</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range yet.</p>
            ) : (
              <MonthlyReportCharts rows={monthlyChart} baseCurrency={baseCurrency} />
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Spending by category</CardTitle>
            <CardDescription>This month ({baseCurrency})</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense categories this month.{" "}
                <Link
                  href="/transactions/new"
                  className="text-primary underline underline-offset-4"
                >
                  Add a transaction
                </Link>
                .
              </p>
            ) : (
              <CategoryReportChart rows={categoryMonth} baseCurrency={baseCurrency} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Account balances</CardTitle>
          <CardDescription>
            Native balance per account; reporting uses base currency ({baseCurrency}).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {accountBalances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts yet.{" "}
              <Link
                href="/accounts/new"
                className="text-primary underline underline-offset-4"
              >
                Create one
              </Link>
              .
            </p>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
              {accountBalances.map((a) => {
                const native = Number(a.balance);
                const base = Number(a.base_balance);
                return (
                  <Link
                    key={a.id}
                    href={`/accounts/${a.id}`}
                    className="min-w-[11rem] shrink-0 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="mt-1 font-mono text-sm tabular-nums">
                      {formatCurrencyCode(native, a.default_currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {baseCurrency}: {formatCurrencyCode(base, baseCurrency)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
