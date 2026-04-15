import { latestFxMultiplierToBase } from "@/features/currencies/lib/latest-fx-to-base";
import { createClient } from "@/lib/supabase/server";

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Multiplier: amount in `fromCurrency` × rate ≈ amount in `baseCurrency`.
 * Uses direct / inverse quotes, then triangulation via USD/EUR/GBP (doc 13).
 */
export async function latestFxToBase(
  supabase: SupabaseServer,
  fromCurrency: string,
  baseCurrency: string,
  onDate: string
): Promise<number | null> {
  return latestFxMultiplierToBase(supabase, fromCurrency, baseCurrency, onDate);
}

/** Map each non-base currency code → multiplier to base (for transaction/account display). */
export async function buildRatesToBaseMap(
  supabase: SupabaseServer,
  baseCurrency: string,
  fromCodes: string[],
  asOfDate: string
): Promise<Record<string, number>> {
  const unique = [...new Set(fromCodes)].filter(
    (c): c is string => Boolean(c) && c !== baseCurrency
  );
  const map: Record<string, number> = { [baseCurrency]: 1 };
  for (const c of unique) {
    const r = await latestFxToBase(supabase, c, baseCurrency, asOfDate);
    if (r != null && r > 0) map[c] = r;
  }
  return map;
}

/**
 * Balance in reporting currency: latest FX × native, or ledger base if no pair is stored.
 */
export async function spotBaseForAccountBalance(
  supabase: SupabaseServer,
  nativeBalance: number,
  ledgerBaseBalance: number,
  accountCurrency: string,
  baseCurrency: string,
  asOfDate: string
): Promise<number> {
  if (accountCurrency === baseCurrency) return nativeBalance;
  const rate = await latestFxToBase(
    supabase,
    accountCurrency,
    baseCurrency,
    asOfDate
  );
  if (rate != null && rate > 0) return nativeBalance * rate;
  return ledgerBaseBalance;
}
