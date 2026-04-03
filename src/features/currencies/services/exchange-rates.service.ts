import { createClient } from "@/lib/supabase/client";

export const exchangeRatesService = {
  /** Latest rate on or before `date` for converting `from` → `to` (e.g. MMK→THB). */
  async getRate(fromCurrency: string, toCurrency: string, date: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .lte("effective_date", date)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { rate: null as number | null, error };
    return { rate: data?.rate != null ? Number(data.rate) : null, error: null };
  },

  /** Rate from line currency into base (for new/edit transaction lines). */
  async resolveLineRateToBase(
    lineCurrency: string,
    baseCurrency: string,
    date: string
  ): Promise<number> {
    if (lineCurrency === baseCurrency) return 1;
    const { rate } = await this.getRate(lineCurrency, baseCurrency, date);
    if (rate != null && rate > 0) return rate;
    const inv = await this.getRate(baseCurrency, lineCurrency, date);
    if (inv.rate != null && inv.rate > 0) return 1 / inv.rate;
    return lineCurrency === "MMK" && baseCurrency === "THB"
      ? 0.0105263158
      : 1;
  },

  async upsertManual(input: {
    from_currency: string;
    to_currency: string;
    rate: number;
    effective_date: string;
  }) {
    const supabase = createClient();
    const row = {
      from_currency: input.from_currency,
      to_currency: input.to_currency,
      rate: input.rate,
      effective_date: input.effective_date,
      source: "manual",
    };
    const res = await supabase
      .from("exchange_rates")
      .upsert(row, {
        onConflict: "from_currency,to_currency,effective_date",
      });
    if (!res.error) return res;
    return supabase.from("exchange_rates").insert(row);
  },

  async listRecent(limit = 50) {
    const supabase = createClient();
    return supabase
      .from("exchange_rates")
      .select("from_currency, to_currency, rate, effective_date, source")
      .order("effective_date", { ascending: false })
      .limit(limit);
  },
};
