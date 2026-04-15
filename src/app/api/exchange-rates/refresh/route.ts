import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Fetches latest FX quotes for profile base → other active currencies and upserts `exchange_rates`.
 * Uses Frankfurter API (ECB); falls back to exchangerate.host.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("id", user.id)
    .maybeSingle();
  const base = profile?.base_currency ?? "THB";

  const { data: currencies } = await supabase
    .from("currencies")
    .select("code")
    .eq("is_active", true);
  const targets = (currencies ?? [])
    .map((c) => c.code)
    .filter((c) => c !== base);
  if (targets.length === 0) {
    return NextResponse.json({ inserted: 0, message: "No target currencies" });
  }

  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let rateDate = today;
  let rates: Record<string, number> = {};
  let source: string = "unknown";

  async function fetchHostRates(): Promise<Record<string, number> | null> {
    const hostUrl = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
    const hostRes = await fetch(hostUrl, { next: { revalidate: 0 } });
    if (!hostRes.ok) return null;
    const hostJson = (await hostRes.json()) as {
      success?: boolean;
      rates?: Record<string, number>;
    };
    if (!hostJson.success || !hostJson.rates) return null;
    return hostJson.rates;
  }

  const frankUrl = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(targets.join(","))}`;
  const frankRes = await fetch(frankUrl, { next: { revalidate: 0 } });
  if (frankRes.ok) {
    const json = (await frankRes.json()) as {
      rates?: Record<string, number>;
      date?: string;
    };
    rates = { ...(json.rates ?? {}) };
    rateDate = json.date ?? today;
    source = "frankfurter";
  } else {
    const hostRates = await fetchHostRates();
    if (!hostRates) {
      return NextResponse.json(
        { error: "Could not fetch exchange rates from external APIs." },
        { status: 502 }
      );
    }
    rates = hostRates;
    source = "exchangerate.host";
  }

  /** Frankfurter (ECB) omits many Asian/emerging pairs — fill from exchangerate.host. */
  const missing = targets.filter(
    (t) => rates[t] == null || !Number.isFinite(rates[t]) || rates[t] <= 0
  );
  if (missing.length > 0) {
    const hostRates = await fetchHostRates();
    if (hostRates) {
      for (const t of missing) {
        const r = hostRates[t];
        if (r != null && Number.isFinite(r) && r > 0) {
          rates[t] = r;
        }
      }
      if (source === "frankfurter" && missing.some((t) => rates[t] != null)) {
        source = "frankfurter+exchangerate.host";
      }
    }
  }

  /** If Frankfurter returned nothing useful, fall back entirely to host. */
  if (
    Object.keys(rates).length === 0 ||
    !targets.some((t) => rates[t] != null && rates[t] > 0)
  ) {
    const hostRates = await fetchHostRates();
    if (hostRates) {
      const merged: Record<string, number> = {};
      for (const t of targets) {
        const r = hostRates[t];
        if (r != null && Number.isFinite(r) && r > 0) merged[t] = r;
      }
      if (Object.keys(merged).length > 0) {
        rates = merged;
        source = "exchangerate.host";
        rateDate = today;
      }
    }
  }

  for (const to of targets) {
    const rate = rates[to];
    if (rate == null || !Number.isFinite(rate) || rate <= 0) continue;
    const { error } = await supabase.from("exchange_rates").upsert(
      {
        from_currency: base,
        to_currency: to,
        rate,
        effective_date: rateDate,
        source,
      },
      { onConflict: "from_currency,to_currency,effective_date" }
    );
    if (!error) inserted += 1;
  }

  return NextResponse.json({
    inserted,
    base,
    effective_date: rateDate,
    source,
  });
}
