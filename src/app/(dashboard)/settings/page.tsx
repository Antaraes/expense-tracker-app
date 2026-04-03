import Link from "next/link";
import { redirect } from "next/navigation";
import { ExchangeRatePanel } from "@/features/currencies/components/exchange-rate-panel";
import { DangerZoneWipe } from "@/features/settings/components/danger-zone-wipe";
import { NotificationPreferences } from "@/features/settings/components/notification-preferences";
import { ExportSettingsActions } from "@/features/settings/components/export-actions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, currencies, accounts, rateRows] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("currencies")
      .select("code, name, symbol")
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("exchange_rates")
      .select("from_currency, to_currency, rate, effective_date, source")
      .order("effective_date", { ascending: false })
      .limit(40),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, theme (header toggle), default account, exports, and FX.
        </p>
      </div>
      <SettingsForm
        profile={profile.data}
        currencies={currencies.data ?? []}
        accounts={accounts.data ?? []}
      />
      <ExportSettingsActions />
      <NotificationPreferences profile={profile.data} />
      <DangerZoneWipe />
      <ExchangeRatePanel
        currencies={(currencies.data ?? []).map((c) => ({
          code: c.code,
          name: c.name,
        }))}
        initialRows={
          (rateRows.data ?? []).map((r) => ({
            from_currency: r.from_currency,
            to_currency: r.to_currency,
            rate: String(r.rate),
            effective_date: r.effective_date,
            source: r.source,
          }))
        }
      />
      <p className="text-xs text-muted-foreground">
        Password and email changes use{" "}
        <Link
          href="/forgot-password"
          className="text-primary underline underline-offset-4"
        >
          password recovery
        </Link>{" "}
        or your Supabase auth settings.
      </p>
    </div>
  );
}
