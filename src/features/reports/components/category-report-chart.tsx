"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryExpenseRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

const COLORS = [
  "#6C5CE7",
  "#00D68F",
  "#FF6B6B",
  "#74B9FF",
  "#FDCB6E",
  "#A29BFE",
  "#FD79A8",
  "#636E72",
];

export function CategoryReportChart({
  rows,
  baseCurrency,
}: {
  rows: CategoryExpenseRow[];
  baseCurrency: string;
}) {
  const data = rows.map((r, i) => ({
    name: r.name,
    value: r.total,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown) => {
              const v =
                typeof value === "number"
                  ? value
                  : Number.parseFloat(String(value ?? ""));
              return Number.isFinite(v)
                ? formatCurrencyCode(v, baseCurrency)
                : "";
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
