"use client";

import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import type {
  CategoryExpenseRow,
  MonthlyRow,
} from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

export function MonthlyReportPdfButton({
  rows,
  baseCurrency,
}: {
  rows: MonthlyRow[];
  baseCurrency: string;
}) {
  function onClick() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    doc.setFontSize(16);
    doc.text("UltraFinance — Monthly overview", margin, y);
    y += 28;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generated ${format(new Date(), "yyyy-MM-dd HH:mm")} · Base ${baseCurrency}`,
      margin,
      y
    );
    y += 28;
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text("Month", margin, y);
    doc.text("Income", margin + 150, y);
    doc.text("Expenses", margin + 270, y);
    doc.text("Net", margin + 390, y);
    y += 16;
    doc.setDrawColor(220);
    doc.line(margin, y, 548, y);
    y += 20;
    for (const r of rows) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      const net = r.income - r.expense;
      doc.text(r.month, margin, y);
      doc.text(formatCurrencyCode(r.income, baseCurrency), margin + 150, y);
      doc.text(formatCurrencyCode(r.expense, baseCurrency), margin + 270, y);
      doc.text(formatCurrencyCode(net, baseCurrency), margin + 390, y);
      y += 22;
    }
    doc.save(`monthly-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 no-print"
      onClick={onClick}
    >
      <FileDown className="size-4" />
      PDF
    </Button>
  );
}

export function CategoryReportPdfButton({
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
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    doc.setFontSize(16);
    doc.text("UltraFinance — Category expenses", margin, y);
    y += 24;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Range ${from} → ${to} · ${baseCurrency}`, margin, y);
    y += 28;
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text("Category", margin, y);
    doc.text("Amount", margin + 260, y);
    doc.text("%", margin + 400, y);
    y += 16;
    doc.setDrawColor(220);
    doc.line(margin, y, 548, y);
    y += 20;
    const total = rows.reduce((s, r) => s + r.total, 0);
    for (const r of rows) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      const pct = total > 0 ? ((r.total / total) * 100).toFixed(1) : "0";
      doc.text(r.name, margin, y);
      doc.text(formatCurrencyCode(r.total, baseCurrency), margin + 260, y);
      doc.text(`${pct}%`, margin + 400, y);
      y += 22;
    }
    doc.save(`category-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 no-print"
      onClick={onClick}
    >
      <FileDown className="size-4" />
      PDF
    </Button>
  );
}
