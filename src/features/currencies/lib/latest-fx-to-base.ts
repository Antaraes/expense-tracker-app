import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

/** Pairs used when no direct `line → base` quote exists (doc 13 triangulation). */
const DEFAULT_PIVOTS = ["USD", "EUR", "GBP"] as const;

/**
 * Multiplier: `amount_in_from * multiplier` ≈ `amount_in_to` (matches `exchange_rates.rate`).
 */
async function forwardMultiplier(
  supabase: Client,
  fromCurrency: string,
  toCurrency: string,
  asOfDate: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const { data: rawDirect } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .lte("effective_date", asOfDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const direct = rawDirect as { rate: string | number } | null;
  if (direct?.rate != null && Number(direct.rate) > 0) {
    return Number(direct.rate);
  }

  const { data: rawInv } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", toCurrency)
    .eq("to_currency", fromCurrency)
    .lte("effective_date", asOfDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const inv = rawInv as { rate: string | number } | null;
  if (inv?.rate != null && Number(inv.rate) > 0) {
    return 1 / Number(inv.rate);
  }

  return null;
}

/**
 * Resolves FX multiplier from line currency into base (reporting) currency using
 * direct / inverse quotes, then triangulation via common pivots (USD, EUR, GBP).
 */
export async function latestFxMultiplierToBase(
  supabase: Client,
  fromCurrency: string,
  baseCurrency: string,
  asOfDate: string,
  pivots: readonly string[] = DEFAULT_PIVOTS
): Promise<number | null> {
  const direct = await forwardMultiplier(supabase, fromCurrency, baseCurrency, asOfDate);
  if (direct != null) return direct;

  const pivotList = [...new Set(pivots)].filter(
    (p) => p && p !== fromCurrency && p !== baseCurrency
  );

  for (const pivot of pivotList) {
    const a = await forwardMultiplier(supabase, fromCurrency, pivot, asOfDate);
    const b = await forwardMultiplier(supabase, pivot, baseCurrency, asOfDate);
    if (a != null && b != null && a > 0 && b > 0) {
      return a * b;
    }
  }

  return null;
}
