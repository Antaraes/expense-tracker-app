"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
import type { LatestRateRow } from "@/features/settings/types";

type TargetRow = { code: string; name: string };

export function ExchangeRatesSettings({
  baseCurrency,
  targets,
  initialRates,
}: {
  baseCurrency: string;
  targets: TargetRow[];
  initialRates: LatestRateRow[];
}) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const r of initialRates) {
      if (r.rate != null) d[r.to_currency] = String(r.rate);
    }
    return d;
  });

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const r of initialRates) {
        if (r.rate != null) next[r.to_currency] = String(r.rate);
      }
      return next;
    });
  }, [initialRates]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = useMemo(() => {
    const map = new Map(initialRates.map((r) => [r.to_currency, r]));
    return targets.map((t) => ({
      currency: t,
      latest: map.get(t.code) ?? {
        to_currency: t.code,
        rate: null,
        effective_date: null,
        source: null,
      },
    }));
  }, [targets, initialRates]);

  async function fetchFromApis() {
    setFetching(true);
    try {
      const res = await fetch("/api/exchange-rates/refresh", { method: "POST" });
      const json = (await res.json()) as {
        inserted?: number;
        error?: string;
        base?: string;
        effective_date?: string;
        source?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Could not refresh rates.");
        return;
      }
      toast.success(
        json.inserted
          ? `Updated ${json.inserted} rate(s) (${json.source ?? "API"}).`
          : "No rates returned — try manual entry for exotic pairs (e.g. MMK)."
      );
      router.refresh();
    } catch {
      toast.error("Network error while refreshing rates.");
    } finally {
      setFetching(false);
    }
  }

  async function saveManual(toCurrency: string) {
    const raw = drafts[toCurrency]?.trim();
    if (!raw) {
      toast.error("Enter a positive number.");
      return;
    }
    const rate = Number.parseFloat(raw);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Rate must be a positive number.");
      return;
    }
    setSavingTo(toCurrency);
    const { error } = await exchangeRatesService.upsertBaseToTargetRate({
      baseCurrency,
      toCurrency,
      rate,
      effectiveDate: today,
    });
    setSavingTo(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Saved 1 ${baseCurrency} = ${rate} ${toCurrency} (${today}).`);
    router.refresh();
  }

  if (targets.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Enable at least one other currency in the catalog to manage exchange rates against{" "}
        <span className="font-medium text-foreground">{baseCurrency}</span>.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Exchange rates</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Used when posting transactions and converting balances to your base currency (
            {baseCurrency}). Stored as: 1 {baseCurrency} = <em>rate</em> units of the other
            currency. You can refresh from online quotes or set today&apos;s rate manually.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={fetching}
          onClick={() => void fetchFromApis()}
        >
          {fetching ? "Fetching…" : "Fetch latest"}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_minmax(0,8rem)_minmax(0,7rem)_auto] gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_minmax(0,7rem)_auto]">
          <span>Currency</span>
          <span className="text-right sm:text-left">1 {baseCurrency} =</span>
          <span>As of</span>
          <span className="text-right sm:text-right"> </span>
        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map(({ currency, latest }) => {
            const draft =
              drafts[currency.code] ??
              (latest.rate != null ? String(latest.rate) : "");
            return (
              <li
                key={currency.code}
                className="grid grid-cols-1 items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_minmax(0,7rem)_auto]"
              >
                <div>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {currency.code}
                  </p>
                  <p className="text-xs text-muted-foreground">{currency.name}</p>
                  {latest.source ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Source: {latest.source}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="font-mono tabular-nums"
                    inputMode="decimal"
                    placeholder="—"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [currency.code]: e.target.value }))
                    }
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {currency.code}
                  </span>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {latest.effective_date ?? "—"}
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingTo === currency.code}
                    onClick={() => void saveManual(currency.code)}
                  >
                    {savingTo === currency.code ? "Saving…" : "Save"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
