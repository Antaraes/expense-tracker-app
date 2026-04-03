"use client";

import { csvEscape, saveTextFile } from "@/lib/export-file";
import type {
  CategoryExpenseRow,
  MonthlyRow,
} from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/button";

export function MonthlyReportCsvButton({
  rows,
  baseCurrency,
}: {
  rows: MonthlyRow[];
  baseCurrency: string;
}) {
  async function run() {
    const header = ["month", "income", "expense", "net"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const net = r.income - r.expense;
      lines.push(
        [
          csvEscape(r.month),
          csvEscape(r.income),
          csvEscape(r.expense),
          csvEscape(net),
        ].join(",")
      );
    }
    const note = `\n# base_currency=${baseCurrency} amounts in base units\n`;
    await saveTextFile(
      `ultrafinance-monthly-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n") + note
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="no-print"
      onClick={() => void run()}
    >
      Export CSV
    </Button>
  );
}

export function CategoryReportCsvButton({
  rows,
  baseCurrency,
  from,
  to,
}: {
  rows: CategoryExpenseRow[];
  baseCurrency: string;
  from: string;
  to: string;
}) {
  async function run() {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const header = ["category", "icon", "color", "amount", "share_pct"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const pct = total > 0 ? (r.total / total) * 100 : 0;
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.icon ?? ""),
          csvEscape(r.color ?? ""),
          csvEscape(r.total),
          csvEscape(pct.toFixed(2)),
        ].join(",")
      );
    }
    const note = `\n# ${from} to ${to} base=${baseCurrency} total=${formatCurrencyCode(total, baseCurrency)}\n`;
    await saveTextFile(
      `ultrafinance-categories-${from}_to_${to}.csv`,
      lines.join("\n") + note
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="no-print"
      onClick={() => void run()}
    >
      Export CSV
    </Button>
  );
}
