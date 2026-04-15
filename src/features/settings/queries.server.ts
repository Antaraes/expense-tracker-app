import type {
  LatestRateRow,
  RateHistoryPoint,
} from "@/features/settings/types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Latest stored quote for each `base → to` pair (for settings UI). */
export async function getLatestBaseToTargetRates(
  supabase: SupabaseServer,
  base: string,
  targetCodes: string[]
): Promise<LatestRateRow[]> {
  const out: LatestRateRow[] = [];
  for (const code of targetCodes) {
    const { data } = await supabase
      .from("exchange_rates")
      .select("rate, effective_date, source")
      .eq("from_currency", base)
      .eq("to_currency", code)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    out.push({
      to_currency: code,
      rate: data?.rate != null ? Number(data.rate) : null,
      effective_date: data?.effective_date ?? null,
      source: data?.source ?? null,
    });
  }
  return out;
}

/** Recent `base → target` rows for sparklines / volatility (one row per day per pair max). */
export async function getBaseToTargetRateHistory(
  supabase: SupabaseServer,
  base: string,
  targetCodes: string[],
  lookbackDays = 21
): Promise<Record<string, RateHistoryPoint[]>> {
  const empty: Record<string, RateHistoryPoint[]> = {};
  for (const c of targetCodes) empty[c] = [];

  if (targetCodes.length === 0) return empty;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("exchange_rates")
    .select("to_currency, effective_date, rate, source")
    .eq("from_currency", base)
    .in("to_currency", targetCodes)
    .gte("effective_date", sinceStr)
    .order("effective_date", { ascending: true });

  for (const row of data ?? []) {
    const code = row.to_currency;
    if (!empty[code]) empty[code] = [];
    empty[code].push({
      date: row.effective_date,
      rate: Number(row.rate),
      source: row.source,
    });
  }

  return empty;
}
