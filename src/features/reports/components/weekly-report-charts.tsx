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
import type { WeeklyRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

export function WeeklyReportCharts({
  rows,
  baseCurrency,
}: {
  rows: WeeklyRow[];
  baseCurrency: string;
}) {
  const data = rows.map((r) => ({
    week: r.weekLabel,
    Income: r.income,
    Expenses: r.expense,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={0} angle={-25} height={60} />
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
