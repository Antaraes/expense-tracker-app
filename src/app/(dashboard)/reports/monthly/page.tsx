import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyReportCharts } from "@/features/reports/components/monthly-report-charts";
import { MonthlyReportCsvButton } from "@/features/reports/components/report-csv-buttons";
import {
  getMonthlyIncomeExpenseForKeys,
  monthKeys,
  monthKeysBetween,
} from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    months?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const months = Math.min(Math.max(Number(sp.months) || 6, 1), 36);
  let keys: string[];
  if (sp.from && sp.to) {
    keys = monthKeysBetween(sp.from, sp.to);
    if (keys.length === 0) keys = monthKeys(months);
  } else {
    keys = monthKeys(months);
  }

  const { rows, error } = await getMonthlyIncomeExpenseForKeys(keys);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Monthly overview
          </h1>
          <p className="text-sm text-muted-foreground">
            {keys[0]} → {keys[keys.length - 1]} · {baseCurrency} ·{" "}
            <Link
              href="/reports/monthly?months=6"
              className="text-primary underline underline-offset-4"
            >
              6m
            </Link>{" "}
            ·{" "}
            <Link
              href="/reports/monthly?months=12"
              className="text-primary underline underline-offset-4"
            >
              12m
            </Link>{" "}
            · add{" "}
            <code className="text-xs">?from=YYYY-MM&to=YYYY-MM</code> for a
            custom month range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthlyReportCsvButton rows={rows} baseCurrency={baseCurrency} />
          <Link
            href="/reports"
            className="text-sm text-primary underline underline-offset-4"
          >
            All reports
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Income vs expenses</CardTitle>
              <CardDescription>
                Net = income minus expenses ({baseCurrency}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyReportCharts rows={rows} baseCurrency={baseCurrency} />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Table</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Month</th>
                    <th className="pb-2 pr-4 font-medium">Income</th>
                    <th className="pb-2 pr-4 font-medium">Expenses</th>
                    <th className="pb-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const net = r.income - r.expense;
                    return (
                      <tr key={r.month} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {r.month}
                        </td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {formatCurrencyCode(r.income, baseCurrency)}
                        </td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {formatCurrencyCode(r.expense, baseCurrency)}
                        </td>
                        <td
                          className={`py-2 font-mono tabular-nums ${
                            net >= 0 ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {formatCurrencyCode(net, baseCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
