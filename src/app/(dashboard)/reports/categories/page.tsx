import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryReportChart } from "@/features/reports/components/category-report-chart";
import { PrintReportButton } from "@/features/reports/components/print-report-button";
import { CategoryReportCsvButton } from "@/features/reports/components/report-csv-buttons";
import {
  currentMonthRange,
  getExpenseByCategory,
} from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export default async function CategoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const def = currentMonthRange();
  const from = sp.from ?? def.from;
  const to = sp.to ?? def.to;

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

  const { rows, error } = await getExpenseByCategory(from, to);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="printable-report space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Spending by category
          </h1>
          <p className="text-sm text-muted-foreground">
            {from} → {to} · {baseCurrency} · use{" "}
            <code className="text-xs no-print">?from=YYYY-MM-DD&to=YYYY-MM-DD</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rows.length > 0 ? (
            <CategoryReportCsvButton
              rows={rows}
              baseCurrency={baseCurrency}
              from={from}
              to={to}
            />
          ) : null}
          <PrintReportButton />
          <Link
            href="/reports"
            className="text-sm text-primary underline underline-offset-4 no-print"
          >
            All reports
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No expense transactions in this range.
        </p>
      ) : (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Chart</CardTitle>
              <CardDescription>Share of spending by category.</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryReportChart rows={rows} baseCurrency={baseCurrency} />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Expense breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Icon</th>
                    <th className="pb-2 pr-2 font-medium">Color</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pct = total > 0 ? (r.total / total) * 100 : 0;
                    return (
                      <tr key={r.categoryId} className="border-b border-border/60">
                        <td className="py-2 pr-2 text-center text-lg" aria-hidden={!r.icon}>
                          {r.icon ?? "—"}
                        </td>
                        <td className="py-2 pr-2">
                          {r.color ? (
                            <span
                              className="inline-block size-4 rounded border border-border"
                              style={{ backgroundColor: r.color }}
                              title={r.color}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{r.name}</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {formatCurrencyCode(r.total, baseCurrency)}
                        </td>
                        <td className="py-2 font-mono tabular-nums">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-sm text-muted-foreground">
                Total: {formatCurrencyCode(total, baseCurrency)}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
