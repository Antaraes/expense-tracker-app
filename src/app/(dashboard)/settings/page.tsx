import Link from "next/link";
import { redirect } from "next/navigation";
import { DangerZoneWipe } from "@/features/settings/components/danger-zone-wipe";
import { ExchangeRatesSettings } from "@/features/settings/components/exchange-rates-settings";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  getBaseToTargetRateHistory,
  getLatestBaseToTargetRates,
} from "@/features/settings/queries.server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile, error: pErr }, { data: currencies }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "display_name, base_currency, default_account_id, push_notifications_enabled, budget_alerts_enabled, recurring_reminders_enabled, budget_alert_threshold_pct"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
      supabase
        .from("accounts")
        .select("id, name")
        .eq("is_archived", false)
        .order("sort_order"),
    ]);

  if (pErr || !profile) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {pErr?.message ?? "Profile not found."}
      </p>
    );
  }

  const base = profile.base_currency;
  const targetCurrencies = (currencies ?? []).filter((c) => c.code !== base);
  const codes = targetCurrencies.map((c) => c.code);
  const [initialFx, initialHistory] = await Promise.all([
    getLatestBaseToTargetRates(supabase, base, codes),
    getBaseToTargetRateHistory(supabase, base, codes, 21),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, reporting currency, exchange rates, and notification preferences.
        </p>
      </div>

      <SettingsForm
        profile={profile}
        currencies={currencies ?? []}
        accounts={accounts ?? []}
      />

      <ExchangeRatesSettings
        baseCurrency={base}
        targets={targetCurrencies}
        initialRates={initialFx}
        initialHistory={initialHistory}
      />

      <DangerZoneWipe />

      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="text-primary underline underline-offset-4">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
