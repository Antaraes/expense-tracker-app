import { createClient } from "@/lib/supabase/server";

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Multiplier: amount in `fromCurrency` × rate ≈ amount in `baseCurrency`.
 * Uses `exchange_rates` direct or inverse pair, latest on or before `onDate`.
 */
export async function latestFxToBase(
  supabase: SupabaseServer,
  fromCurrency: string,
  baseCurrency: string,
  onDate: string
): Promise<number | null> {
  if (fromCurrency === baseCurrency) return 1;
  const { data: direct } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", baseCurrency)
    .lte("effective_date", onDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (direct?.rate != null && Number(direct.rate) > 0) {
    return Number(direct.rate);
  }
  const { data: inv } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", baseCurrency)
    .eq("to_currency", fromCurrency)
    .lte("effective_date", onDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inv?.rate != null && Number(inv.rate) > 0) {
    return 1 / Number(inv.rate);
  }
  return null;
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
