import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          All figures use base amounts from ledger lines (your profile base
          currency).
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/reports/monthly" className="block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full border-border transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>Monthly overview</CardTitle>
              <CardDescription>
                Income and expenses for each of the last six months.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link
          href="/reports/categories"
          className="block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full border-border transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>Spending by category</CardTitle>
              <CardDescription>
                Expense totals grouped by category for the current month.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
