import Link from "next/link";
import { redirect } from "next/navigation";
import { DangerZoneWipe } from "@/features/settings/components/danger-zone-wipe";
import { ExchangeRatesSettings } from "@/features/settings/components/exchange-rates-settings";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  getBaseToTargetRateHistory,
  getLatestBaseToTargetRates,
  getSettingsPageBootstrap,
} from "@/features/settings/queries.server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    profile,
    currencies,
    accounts,
    profileError: pErr,
  } = await getSettingsPageBootstrap(user.id);

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
