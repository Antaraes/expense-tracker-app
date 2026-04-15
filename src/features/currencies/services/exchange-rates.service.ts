import { createClient } from "@/lib/supabase/client";

export const exchangeRatesService = {
  /**
   * Multiplier so that `amount_in_line_ccy * rate ≈ amount_in_base_ccy`
   * (matches `create_transaction` / seed usage).
   */
  async resolveLineRateToBase(
    lineCurrency: string,
    baseCurrency: string,
    asOfDate: string
  ): Promise<number> {
    if (lineCurrency === baseCurrency) return 1;

    const supabase = createClient();
    const { data: direct } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", lineCurrency)
      .eq("to_currency", baseCurrency)
      .lte("effective_date", asOfDate)
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
      .eq("to_currency", lineCurrency)
      .lte("effective_date", asOfDate)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inv?.rate != null && Number(inv.rate) > 0) {
      return 1 / Number(inv.rate);
    }

    return 1;
  },

  /**
   * Upsert `from_currency = baseCurrency` → `to_currency` for a given calendar day
   * (manual correction or offline quote).
   */
  async upsertBaseToTargetRate(input: {
    baseCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: string;
  }): Promise<{ error: Error | null }> {
    const { baseCurrency, toCurrency, rate, effectiveDate } = input;
    if (baseCurrency === toCurrency) {
      return { error: new Error("Rates are only needed between different currencies.") };
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      return { error: new Error("Rate must be a positive number.") };
    }
    const supabase = createClient();
    const { error } = await supabase.from("exchange_rates").upsert(
      {
        from_currency: baseCurrency,
        to_currency: toCurrency,
        rate,
        effective_date: effectiveDate,
        source: "manual",
      },
      { onConflict: "from_currency,to_currency,effective_date" }
    );
    if (error) return { error: new Error(error.message) };
    return { error: null };
  },
};
