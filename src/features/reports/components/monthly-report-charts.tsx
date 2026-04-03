"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

export function MonthlyReportCharts({
  rows,
  baseCurrency,
}: {
  rows: MonthlyRow[];
  baseCurrency: string;
}) {
  const data = rows.map((r) => ({
    month: r.month,
    Income: r.income,
    Expenses: r.expense,
    Net: r.income - r.expense,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) =>
              new Intl.NumberFormat(undefined, {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(v)
            }
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              const v =
                typeof value === "number"
                  ? value
                  : Number.parseFloat(String(value ?? ""));
              return [
                Number.isFinite(v)
                  ? formatCurrencyCode(v, baseCurrency)
                  : "",
                String(name ?? ""),
              ];
            }}
          />
          <Legend />
          <Bar dataKey="Income" fill="hsl(156 100% 42%)" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="Expenses"
            fill="hsl(0 72% 71%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
