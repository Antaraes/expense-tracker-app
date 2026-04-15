"use client";

import { format, parseISO } from "date-fns";
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

const CHART_INCOME = "var(--chart-1)";
const CHART_EXPENSE = "var(--chart-2)";

export function MonthlyReportCharts({
  rows,
  baseCurrency,
}: {
  rows: MonthlyRow[];
  baseCurrency: string;
}) {
  const data = rows.map((r) => ({
    key: r.month,
    label: format(parseISO(`${r.month}-01`), "MMM yyyy"),
    income: r.income,
    expense: r.expense,
  }));

  return (
    <div className="h-[min(22rem,50vh)] w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              Number(v) >= 1_000_000
                ? `${(Number(v) / 1_000_000).toFixed(1)}M`
                : Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(1)}k`
                  : String(v)
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-md">
                  <p className="mb-1 font-medium">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} className="font-mono tabular-nums">
                      {p.name}:{" "}
                      {formatCurrencyCode(Number(p.value), baseCurrency)}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            name="Income"
            dataKey="income"
            fill={CHART_INCOME}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            name="Expenses"
            dataKey="expense"
            fill={CHART_EXPENSE}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
