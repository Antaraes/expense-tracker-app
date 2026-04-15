import type { LatestRateRow } from "@/features/settings/types";
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
