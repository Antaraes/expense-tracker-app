import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrintReportButton } from "@/features/reports/components/print-report-button";
import { getCurrencyExposure } from "@/features/reports/queries.server";
import { createClient } from "@/lib/supabase/server";

export default async function CurrencyExposurePage() {
  const { rows, error } = await getCurrencyExposure();

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
            Currency exposure
          </h1>
          <p className="text-sm text-muted-foreground">
            Sum of account native balances by currency (active accounts). Compare
            to base ({baseCurrency}) using your ledger base column elsewhere.
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
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Balances by currency</CardTitle>
            <CardDescription>
              Native currency amounts from account balances view.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Currency</th>
                  <th className="pb-2 font-medium">Net native position</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.currencyCode} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono">{r.currencyCode}</td>
                    <td className="py-2 font-mono tabular-nums">
                      {r.totalNative.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted-foreground">
              For {baseCurrency} reporting totals, use dashboard net worth or
              account base balances — those use historical rates at transaction
              time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
