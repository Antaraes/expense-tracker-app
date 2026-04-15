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

const FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function segmentColor(row: CategoryExpenseRow, index: number): string {
  if (row.color) {
    const c = row.color.trim();
    if (/^(#|hsl|rgb|var\()/i.test(c)) return c;
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function CategoryReportChart({
  rows,
  baseCurrency,
}: {
  rows: CategoryExpenseRow[];
  baseCurrency: string;
}) {
  const data = rows
    .filter((r) => r.total > 0)
    .map((r, i) => ({
      name: r.name,
      value: r.total,
      fill: segmentColor(r, i),
    }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No category totals to chart.</p>
    );
  }

  return (
    <div className="h-[min(22rem,50vh)] w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const name = String(p.name ?? "");
              const value = Number(p.value);
              return (
                <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-md">
                  <p className="font-medium">{name}</p>
                  <p className="font-mono tabular-nums">
                    {formatCurrencyCode(value, baseCurrency)}
                  </p>
                </div>
              );
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 11, maxHeight: "100%", overflowY: "auto" }}
            formatter={(value) => (
              <span className="text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
