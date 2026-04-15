"use client";

import { Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { CategoryExpenseRow, MonthlyRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCell(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function MonthlyReportCsvButton({
  rows,
  baseCurrency,
}: {
  rows: MonthlyRow[];
  baseCurrency: string;
}) {
  function onClick() {
    const header = ["Month", "Income", "Expenses", "Net"].map(escapeCell).join(",");
    const lines = rows.map((r) => {
      const net = r.income - r.expense;
      return [
        r.month,
        formatCurrencyCode(r.income, baseCurrency),
        formatCurrencyCode(r.expense, baseCurrency),
        formatCurrencyCode(net, baseCurrency),
      ]
        .map((c) => escapeCell(c))
        .join(",");
    });
    const stamp = format(new Date(), "yyyy-MM-dd");
    downloadCsv([header, ...lines].join("\r\n"), `monthly-report-${stamp}.csv`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 no-print"
      onClick={onClick}
    >
      <Download className="size-4" />
      CSV
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
  function onClick() {
    const header = ["Category", "Amount", "Share %"].map(escapeCell).join(",");
    const total = rows.reduce((s, r) => s + r.total, 0);
    const lines = rows.map((r) => {
      const pct = total > 0 ? ((r.total / total) * 100).toFixed(1) : "0";
      return [r.name, formatCurrencyCode(r.total, baseCurrency), `${pct}%`]
        .map((c) => escapeCell(c))
        .join(",");
    });
    const stamp = format(new Date(), "yyyy-MM-dd");
    downloadCsv(
      [`Range,${escapeCell(`${from} → ${to}`)}`, "", header, ...lines].join(
        "\r\n"
      ),
      `category-report-${stamp}.csv`
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 no-print"
      onClick={onClick}
    >
      <Download className="size-4" />
      CSV
    </Button>
  );
}
