import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const links = [
  { href: "/reports/monthly", title: "Monthly overview", desc: "Income vs expenses by month." },
  { href: "/reports/weekly", title: "Weekly overview", desc: "Income vs expenses by calendar week." },
  { href: "/reports/categories", title: "Spending by category", desc: "Expense mix for a date range." },
  { href: "/reports/currency-exposure", title: "Currency exposure", desc: "Native balances grouped by currency." },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Printable views and CSV exports where available.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full border-border transition-colors hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">{l.title}</CardTitle>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="text-primary underline underline-offset-4">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
