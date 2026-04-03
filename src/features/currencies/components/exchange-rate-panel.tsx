"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = {
  from_currency: string;
  to_currency: string;
  rate: string;
  effective_date: string;
  source: string | null;
};

export function ExchangeRatePanel({
  currencies,
  initialRows,
}: {
  currencies: { code: string; name: string }[];
  initialRows: Row[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(currencies[0]?.code ?? "THB");
  const [to, setTo] = useState(currencies[1]?.code ?? "MMK");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function onManual(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const r = Number.parseFloat(rate);
    if (Number.isNaN(r) || r <= 0) {
      setError("Enter a positive rate.");
      return;
    }
    if (from === to) {
      setError("From and to must differ.");
      return;
    }
    setLoading(true);
    const { error: err } = await exchangeRatesService.upsertManual({
      from_currency: from,
      to_currency: to,
      rate: r,
      effective_date: date,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRate("");
    router.refresh();
  }

  async function onRefreshApi() {
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch("/api/exchange-rates/refresh", { method: "POST" });
      const json = (await res.json()) as { error?: string; inserted?: number };
      if (!res.ok) {
        setError(json.error ?? "Refresh failed");
        return;
      }
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>Exchange rates</CardTitle>
        <CardDescription>
          Manual overrides and API refresh (Frankfurter / exchangerate.host).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={refreshing}
            onClick={() => void onRefreshApi()}
          >
            {refreshing ? "Refreshing…" : "Fetch latest (API)"}
          </Button>
        </div>

        <form onSubmit={onManual} className="space-y-3">
          <p className="text-sm font-medium">Manual rate</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fx-from">From</Label>
              <select
                id="fx-from"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fx-to">To</Label>
              <select
                id="fx-to"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fx-rate">Rate (1 from = ? to)</Label>
              <Input
                id="fx-rate"
                className="font-mono tabular-nums"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.000000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fx-date">Effective date</Label>
              <Input
                id="fx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save manual rate"}
          </Button>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium">Recent rows</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-xs font-mono">
            {initialRows.length === 0 ? (
              <li className="text-muted-foreground">No rates yet.</li>
            ) : (
              initialRows.map((r, i) => (
                <li key={`${r.from_currency}-${r.to_currency}-${r.effective_date}-${i}`}>
                  {r.effective_date} {r.from_currency}→{r.to_currency}{" "}
                  {r.rate} ({r.source ?? "?"})
                </li>
              ))
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
