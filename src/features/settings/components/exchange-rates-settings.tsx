"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
import { cn } from "@/lib/utils";
import type {
  LatestRateRow,
  RateHistoryPoint,
} from "@/features/settings/types";

type TargetRow = { code: string; name: string };

const FLAG: Record<string, string> = {
  THB: "🇹🇭",
  MMK: "🇲🇲",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  SGD: "🇸🇬",
};

function flagFor(code: string) {
  return FLAG[code] ?? "◆";
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function maxVolatilityInWindow(
  historyByCode: Record<string, RateHistoryPoint[]>,
  windowDays = 7
): { maxPct: number; worstCode: string | null } {
  let max = 0;
  let worst: string | null = null;
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (const [ccy, points] of Object.entries(historyByCode)) {
    const recent = points.filter((p) => p.date >= cutoffStr);
    if (recent.length < 2) continue;
    const first = recent[0]!.rate;
    const last = recent[recent.length - 1]!.rate;
    if (first <= 0) continue;
    const pct = Math.abs(((last - first) / first) * 100);
    if (pct > max) {
      max = pct;
      worst = ccy;
    }
  }
  return { maxPct: max, worstCode: worst };
}

function Sparkline({
  data,
  width = 110,
  height = 32,
  color,
}: {
  data: RateHistoryPoint[];
  width?: number;
  height?: number;
  color: string;
}) {
  const uid = useId().replace(/:/g, "");
  if (!data || data.length < 2) return null;
  const rates = data.map((d) => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const points = rates.map((r, i) => {
    const x = (i / (rates.length - 1)) * width;
    const y = height - ((r - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const last = points[points.length - 1]!.split(",");
  const cx = Number(last[0]);
  const cy = Number(last[1]);

  return (
    <svg width={width} height={height} className="block shrink-0" aria-hidden>
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${uid})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r={2.5} fill={color} />
    </svg>
  );
}

function QuickConverter({
  baseCurrency,
  targetCode,
  targetFlag,
  rate,
}: {
  baseCurrency: string;
  targetCode: string;
  targetFlag: string;
  rate: number | null;
}) {
  /** Left field is always the editable amount: base units if false, target units if true. */
  const [reversed, setReversed] = useState(false);
  const [inputValue, setInputValue] = useState(
    () => (baseCurrency === "MMK" ? "100000" : "1000")
  );

  const parsed = useMemo(() => {
    const n = Number.parseFloat(inputValue.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }, [inputValue]);

  const converted = useMemo(() => {
    if (rate == null || rate <= 0 || parsed == null) return null;
    return reversed ? parsed / rate : parsed * rate;
  }, [parsed, rate, reversed]);

  const inverse =
    rate != null && rate > 0
      ? (1 / rate).toLocaleString(undefined, { maximumFractionDigits: 6 })
      : "—";

  function toggleReverse() {
    if (rate == null || rate <= 0) {
      setReversed((r) => !r);
      return;
    }
    const v = Number.parseFloat(inputValue.replace(/,/g, ""));
    if (!Number.isFinite(v)) {
      setReversed((r) => !r);
      return;
    }
    if (!reversed) {
      // was: v base → v*rate target; left becomes target input
      setInputValue(String(roundForInput(v * rate)));
    } else {
      // was: v target → v/rate base; left becomes base input
      setInputValue(String(roundForInput(v / rate)));
    }
    setReversed((r) => !r);
  }

  const leftCode = reversed ? targetCode : baseCurrency;
  const rightCode = reversed ? baseCurrency : targetCode;
  const leftFlag = reversed ? targetFlag : flagFor(baseCurrency);
  const rightFlag = reversed ? flagFor(baseCurrency) : targetFlag;

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Quick convert ({leftCode} → {rightCode})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
          <span className="text-base">{leftFlag}</span>
          <Input
            className="min-w-0 border-0 bg-transparent p-0 font-mono text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) =>
              setInputValue(e.target.value.replace(/[^0-9.]/g, ""))
            }
            placeholder="0"
            aria-label={`Amount in ${leftCode}`}
          />
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            {leftCode}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={toggleReverse}
          aria-label="Swap which side you type (base ↔ target)"
          title="Reverse conversion (base ↔ target)"
        >
          <span className="text-lg leading-none" aria-hidden>
            ⇌
          </span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-2">
          <span className="text-base">{rightFlag}</span>
          <span className="min-w-0 flex-1 font-mono text-sm font-semibold tabular-nums text-primary">
            {converted != null
              ? converted.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              : "—"}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            {rightCode}
          </span>
        </div>
      </div>
      <p className="text-center font-mono text-[11px] text-muted-foreground">
        1 {baseCurrency} = {rate != null && rate > 0 ? rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}{" "}
        {targetCode} · 1 {targetCode} ≈ {inverse} {baseCurrency}
      </p>
    </div>
  );
}

/** Avoid huge decimal strings when swapping. */
function roundForInput(n: number) {
  if (!Number.isFinite(n)) return n;
  const abs = Math.abs(n);
  if (abs >= 1e9) return Math.round(n);
  if (abs >= 1) return Math.round(n * 1e6) / 1e6;
  return Math.round(n * 1e8) / 1e8;
}

function inverseFromDirectDraft(d: string): string {
  const n = Number.parseFloat(d.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(roundForInput(1 / n));
}

/** Stored rate = 1 base = `rate` target (same as DB). */
function resolveStoredRateFromManualPair(
  directStr: string,
  inverseStr: string
): number | null {
  const d = Number.parseFloat(directStr.replace(/,/g, ""));
  if (Number.isFinite(d) && d > 0) return d;
  const inv = Number.parseFloat(inverseStr.replace(/,/g, ""));
  if (Number.isFinite(inv) && inv > 0) return 1 / inv;
  return null;
}

/**
 * Two text fields: 1 base = ? target, and 1 target = ? base.
 * Cross-links on blur so users can enter whichever quote they have (e.g. MMK/THB).
 */
function ManualRatePair({
  baseCurrency,
  targetCode,
  draft,
  onDraft,
  saving,
  onCommitRate,
  directInputId,
  inverseInputId,
}: {
  baseCurrency: string;
  targetCode: string;
  draft: string;
  onDraft: (direct: string) => void;
  saving: boolean;
  onCommitRate: (rate: number) => void | Promise<void>;
  directInputId: string;
  inverseInputId: string;
}) {
  const [directStr, setDirectStr] = useState(draft);
  const [inverseStr, setInverseStr] = useState(() => inverseFromDirectDraft(draft));

  useEffect(() => {
    setDirectStr(draft);
    setInverseStr(inverseFromDirectDraft(draft));
  }, [draft]);

  async function submitRate() {
    const rate = resolveStoredRateFromManualPair(directStr, inverseStr);
    if (rate == null) {
      toast.error(
        "Enter a positive number in either row (for example MMK per THB or THB per MMK)."
      );
      return;
    }
    await onCommitRate(rate);
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Type the rate in either row (for example 1 MMK = … THB or 1 THB = … MMK). The
        other row updates when you leave the field.
      </p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
          <span className="shrink-0 text-[10px] text-muted-foreground">
            1 {baseCurrency} =
          </span>
          <Input
            id={directInputId}
            className="h-8 min-w-0 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:ring-0"
            inputMode="decimal"
            placeholder="—"
            value={directStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              setDirectStr(v);
            }}
            onBlur={() => {
              const n = Number.parseFloat(directStr.replace(/,/g, ""));
              if (Number.isFinite(n) && n > 0) {
                const rd = String(roundForInput(n));
                setDirectStr(rd);
                setInverseStr(String(roundForInput(1 / n)));
                onDraft(rd);
              }
            }}
            aria-label={`How many ${targetCode} per one ${baseCurrency}`}
          />
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {targetCode}
          </span>
        </div>

        <div
          className="hidden shrink-0 select-none text-center text-lg text-primary lg:block"
          aria-hidden
        >
          ⇌
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5">
          <span className="shrink-0 text-[10px] text-muted-foreground">
            1 {targetCode} =
          </span>
          <Input
            id={inverseInputId}
            className="h-8 min-w-0 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:ring-0"
            inputMode="decimal"
            placeholder="—"
            value={inverseStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              setInverseStr(v);
            }}
            onBlur={() => {
              const n = Number.parseFloat(inverseStr.replace(/,/g, ""));
              if (Number.isFinite(n) && n > 0) {
                const ri = String(roundForInput(n));
                const dir = String(roundForInput(1 / n));
                setInverseStr(ri);
                setDirectStr(dir);
                onDraft(dir);
              }
            }}
            aria-label={`How many ${baseCurrency} per one ${targetCode}`}
          />
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {baseCurrency}
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={(e) => {
            e.stopPropagation();
            void submitRate();
          }}
        >
          {saving ? "…" : "Save rate"}
        </Button>
      </div>
    </div>
  );
}

function VolatilityAlert({
  maxPct,
  worstCode,
  onDismiss,
}: {
  maxPct: number;
  worstCode: string | null;
  onDismiss: () => void;
}) {
  if (maxPct < 1.2) return null;
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-amber-950 dark:text-amber-100"
      role="status"
    >
      <span className="text-base" aria-hidden>
        ⚡
      </span>
      <div className="min-w-0 flex-1 text-xs leading-snug">
        <strong className="text-foreground">Volatility</strong>
        {worstCode ? (
          <>
            {" "}
            — <span className="font-mono">{worstCode}</span> moved{" "}
            <span className="font-mono">{maxPct.toFixed(2)}%</span> over the
            last week. Consider refreshing rates more often for accuracy.
          </>
        ) : (
          " — Exchange rates have moved sharply recently."
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-amber-700 opacity-70 hover:opacity-100 dark:text-amber-200"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function RateCard({
  baseCurrency,
  currency,
  latest,
  history,
  draft,
  onDraft,
  isExpanded,
  onToggle,
  saving,
  onCommitRate,
  onUpdateClick,
  onManualClick,
  directInputId,
  inverseInputId,
}: {
  baseCurrency: string;
  currency: TargetRow;
  latest: LatestRateRow;
  history: RateHistoryPoint[];
  draft: string;
  onDraft: (v: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  saving: boolean;
  onCommitRate: (rate: number) => void | Promise<void>;
  onUpdateClick: () => void;
  onManualClick: () => void;
  directInputId: string;
  inverseInputId: string;
}) {
  const pts = history.length > 0 ? history : [];
  const prev = pts.length >= 2 ? pts[pts.length - 2]!.rate : null;
  const curr = latest.rate;
  const change =
    prev != null && curr != null && prev > 0
      ? ((curr - prev) / prev) * 100
      : 0;
  const isUp = change > 0;
  const sparkColor = isUp ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)";
  const rates14 = pts.map((d) => d.rate);
  const high14 = rates14.length ? Math.max(...rates14) : null;
  const low14 = rates14.length ? Math.min(...rates14) : null;
  const spreadPct =
    high14 != null && low14 != null && low14 > 0
      ? ((high14 - low14) / low14) * 100
      : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-all duration-200",
        isExpanded
          ? "border-primary/30 bg-card shadow-md ring-1 ring-primary/10"
          : "border-border bg-card/80"
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-3 text-left sm:gap-3 sm:px-4"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex min-w-[8.5rem] items-center gap-2.5 sm:min-w-[10rem]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
            {flagFor(currency.code)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-wide">
                {currency.code}
              </span>
              {latest.source ? (
                <span className="rounded bg-primary/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  {latest.source}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {currency.name}
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center sm:flex">
          {pts.length >= 2 ? (
            <div className={cn(isUp ? "text-emerald-600" : "text-red-600")}>
              <Sparkline data={pts} color={sparkColor} width={110} height={32} />
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Not enough history
            </span>
          )}
        </div>

        <div className="ml-auto shrink-0 text-right">
          <div className="font-mono text-sm font-semibold tabular-nums">
            {curr != null ? curr.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
          </div>
          {prev != null && curr != null ? (
            <div
              className={cn(
                "mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                isUp
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-700 dark:text-red-400"
              )}
            >
              {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </div>
          ) : null}
        </div>

        <span
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            isExpanded ? "rotate-90" : "-rotate-90"
          )}
          aria-hidden
        >
          ‹
        </span>
      </button>

      {!isExpanded && pts.length >= 2 ? (
        <div
          className="flex justify-center border-t border-border/40 py-2 sm:hidden"
          aria-hidden
        >
          <div className={cn(isUp ? "text-emerald-600" : "text-red-600")}>
            <Sparkline data={pts} color={sparkColor} width={200} height={28} />
          </div>
        </div>
      ) : null}

      {isExpanded ? (
        <div className="space-y-3 border-t border-border px-3 pb-4 pt-1 sm:px-4">
          <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-2 text-center text-[10px]">
            <div className="min-w-[4.5rem] flex-1 px-1">
              <span className="mb-1 block uppercase tracking-wider text-muted-foreground">
                14d high
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {high14 != null ? high14.toFixed(6) : "—"}
              </span>
            </div>
            <div className="w-px bg-border" />
            <div className="min-w-[4.5rem] flex-1 px-1">
              <span className="mb-1 block uppercase tracking-wider text-muted-foreground">
                14d low
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {low14 != null ? low14.toFixed(6) : "—"}
              </span>
            </div>
            <div className="w-px bg-border" />
            <div className="min-w-[4.5rem] flex-1 px-1">
              <span className="mb-1 block uppercase tracking-wider text-muted-foreground">
                Range %
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {spreadPct != null ? `${spreadPct.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="w-px bg-border" />
            <div className="min-w-[4.5rem] flex-1 px-1">
              <span className="mb-1 block uppercase tracking-wider text-muted-foreground">
                As of
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {latest.effective_date ? shortDate(latest.effective_date) : "—"}
              </span>
            </div>
          </div>

          <QuickConverter
            baseCurrency={baseCurrency}
            targetCode={currency.code}
            targetFlag={flagFor(currency.code)}
            rate={curr}
          />

          <ManualRatePair
            baseCurrency={baseCurrency}
            targetCode={currency.code}
            draft={draft}
            onDraft={onDraft}
            saving={saving}
            onCommitRate={onCommitRate}
            directInputId={directInputId}
            inverseInputId={inverseInputId}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateClick();
              }}
            >
              ↻ Update rate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onManualClick();
              }}
            >
              ✎ Edit manually
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ExchangeRatesSettings({
  baseCurrency,
  targets,
  initialRates,
  initialHistory,
}: {
  baseCurrency: string;
  targets: TargetRow[];
  initialRates: LatestRateRow[];
  initialHistory: Record<string, RateHistoryPoint[]>;
}) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [history, setHistory] = useState(initialHistory);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const r of initialRates) {
      if (r.rate != null) d[r.to_currency] = String(r.rate);
    }
    return d;
  });

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

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

  const lastStoredLabel = useMemo(() => {
    const dates = initialRates
      .map((r) => r.effective_date)
      .filter(Boolean)
      .sort()
      .reverse();
    const d = dates[0];
    if (!d) return null;
    const dt = new Date(`${d}T12:00:00`);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [initialRates]);

  const vol = useMemo(
    () => maxVolatilityInWindow(history, 7),
    [history]
  );

  async function fetchFromApis() {
    setFetching(true);
    try {
      const res = await fetch("/api/exchange-rates/refresh", { method: "POST" });
      const json = (await res.json()) as {
        inserted?: number;
        error?: string;
        source?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Could not refresh rates.");
        return;
      }
      toast.success(
        json.inserted
          ? `Updated ${json.inserted} rate(s) (${json.source ?? "API"}).`
          : "No new quotes — try manual entry for pairs missing from ECB feeds."
      );
      router.refresh();
    } catch {
      toast.error("Network error while refreshing rates.");
    } finally {
      setFetching(false);
    }
  }

  async function commitRate(toCurrency: string, rate: number) {
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
    setDrafts((d) => ({ ...d, [toCurrency]: String(rate) }));
    toast.success(`Saved 1 ${baseCurrency} = ${rate} ${toCurrency}.`);
    router.refresh();
  }

  if (targets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Enable at least one other currency in the catalog to manage exchange rates against{" "}
        <span className="font-medium text-foreground">{baseCurrency}</span>.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/60 via-muted/25 to-background p-4 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Exchange rates
          </h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
            Base: <strong className="text-foreground">{baseCurrency}</strong> ·
            Stored as{" "}
            <span className="font-mono">
              1 {baseCurrency} = rate × other
            </span>{" "}
            for ledger conversion. Fetch live quotes or override for today.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={fetching}
          className="shrink-0 gap-1.5 shadow-md"
          onClick={() => void fetchFromApis()}
        >
          <span className="text-base" aria-hidden>
            ↻
          </span>
          {fetching ? "Fetching…" : "Fetch all"}
        </Button>
      </div>

      {!alertDismissed ? (
        <VolatilityAlert
          maxPct={vol.maxPct}
          worstCode={vol.worstCode}
          onDismiss={() => setAlertDismissed(true)}
        />
      ) : null}

      <div className="flex flex-col gap-2.5">
        {rows.map(({ currency, latest }, i) => {
          const h = history[currency.code] ?? [];
          return (
            <RateCard
              key={currency.code}
              baseCurrency={baseCurrency}
              currency={currency}
              latest={latest}
              history={h}
              draft={
                drafts[currency.code] ??
                (latest.rate != null ? String(latest.rate) : "")
              }
              onDraft={(v) =>
                setDrafts((d) => ({ ...d, [currency.code]: v }))
              }
              isExpanded={expandedIdx === i}
              onToggle={() =>
                setExpandedIdx(expandedIdx === i ? -1 : i)
              }
              saving={savingTo === currency.code}
              onCommitRate={(rate) => commitRate(currency.code, rate)}
              onUpdateClick={() => void fetchFromApis()}
              onManualClick={() => {
                setExpandedIdx(i);
                requestAnimationFrame(() => {
                  document.getElementById(`fx-rate-${currency.code}`)?.focus();
                });
              }}
              directInputId={`fx-rate-${currency.code}`}
              inverseInputId={`fx-rate-${currency.code}-inv`}
            />
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {lastStoredLabel ? (
          <>Latest stored rate date: {lastStoredLabel} · </>
        ) : null}
        Rates are applied per transaction date in the ledger.
      </p>
    </div>
  );
}
