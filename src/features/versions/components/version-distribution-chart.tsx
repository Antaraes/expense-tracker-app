"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminVersionsService } from "@/features/versions/services/admin-versions.service";

type Row = { app_version: string; device_count: number };

export function VersionDistributionChart() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await adminVersionsService.getDesktopDistribution();
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = rows.map((r) => ({
    version: r.app_version || "(unknown)",
    devices: Number(r.device_count),
  }));

  const total = chartData.reduce((s, r) => s + r.devices, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop installs by app version</CardTitle>
        <CardDescription>
          {loading
            ? "Loading…"
            : err
              ? err
              : `From active desktop push_tokens (${total} device${total === 1 ? "" : "s"}).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        {chartData.length === 0 && !loading && !err ? (
          <p className="text-sm text-muted-foreground px-6">
            No desktop clients have reported a version yet.
          </p>
        ) : chartData.length > 0 ? (
          <div className="aspect-[21/9] min-h-[220px] w-full max-h-[320px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 28, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="version"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="devices"
                  fill="hsl(var(--chart-1))"
                  radius={4}
                  name="Devices"
                >
                  <LabelList
                    dataKey="devices"
                    position="right"
                    className="fill-foreground text-xs"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
