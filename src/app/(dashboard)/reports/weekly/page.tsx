import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrintReportButton } from "@/features/reports/components/print-report-button";
import { WeeklyReportCharts } from "@/features/reports/components/weekly-report-charts";
import { getWeeklyIncomeExpense } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>;
}) {
  const sp = await searchParams;
  const weeks = Math.min(Math.max(Number(sp.weeks) || 8, 2), 26);
  const { rows, error } = await getWeeklyIncomeExpense(weeks);

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
    <div className="printable-report space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Mon–Sun weeks · {baseCurrency} ·{" "}
            <Link
              href="/reports/weekly?weeks=8"
              className="text-primary underline underline-offset-4"
            >
              8w
            </Link>{" "}
            ·{" "}
            <Link
              href="/reports/weekly?weeks=12"
              className="text-primary underline underline-offset-4"
            >
              12w
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <PrintReportButton />
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
              <CardTitle>Income vs expenses by week</CardTitle>
              <CardDescription>Calendar weeks (ISO week starts Monday).</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyReportCharts rows={rows} baseCurrency={baseCurrency} />
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
                    <th className="pb-2 pr-4 font-medium">Week</th>
                    <th className="pb-2 pr-4 font-medium">Income</th>
                    <th className="pb-2 pr-4 font-medium">Expenses</th>
                    <th className="pb-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const net = r.income - r.expense;
                    return (
                      <tr key={r.weekStart} className="border-b border-border/60">
                        <td className="py-2 pr-4">{r.weekLabel}</td>
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
