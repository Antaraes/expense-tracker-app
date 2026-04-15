"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profilesService } from "@/features/profiles/services/profiles.service";

type CurrencyRow = { code: string; name: string };
type AccountRow = { id: string; name: string };

export function SettingsForm({
  profile,
  currencies,
  accounts,
}: {
  profile: {
    display_name: string | null;
    base_currency: string;
    default_account_id: string | null;
    push_notifications_enabled: boolean;
    budget_alerts_enabled: boolean;
    recurring_reminders_enabled: boolean;
    budget_alert_threshold_pct: number;
  };
  currencies: CurrencyRow[];
  accounts: AccountRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [baseCurrency, setBaseCurrency] = useState(profile.base_currency);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(
    profile.default_account_id
  );
  const [pushOn, setPushOn] = useState(profile.push_notifications_enabled);
  const [budgetAlerts, setBudgetAlerts] = useState(profile.budget_alerts_enabled);
  const [recurringOn, setRecurringOn] = useState(profile.recurring_reminders_enabled);
  const [threshold, setThreshold] = useState(String(profile.budget_alert_threshold_pct));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const th = Number.parseInt(threshold, 10);
    if (Number.isNaN(th) || th < 1 || th > 100) {
      toast.error("Budget alert threshold must be 1–100.");
      return;
    }
    setLoading(true);
    const { error } = await profilesService.updateMine({
      display_name: displayName.trim() || null,
      base_currency: baseCurrency,
      default_account_id: defaultAccountId,
      push_notifications_enabled: pushOn,
      budget_alerts_enabled: budgetAlerts,
      recurring_reminders_enabled: recurringOn,
      budget_alert_threshold_pct: th,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved.");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="disp">Display name</Label>
        <Input
          id="disp"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Base currency (reports)</Label>
        <Select value={baseCurrency} onValueChange={setBaseCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Default account</Label>
        <Select
          value={defaultAccountId ?? "__none__"}
          onValueChange={(v) => setDefaultAccountId(v === "__none__" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 rounded-md border border-border p-4">
        <p className="text-sm font-medium">Notifications</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={pushOn}
            onChange={(e) => setPushOn(e.target.checked)}
          />
          Desktop push (browser permission required)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={budgetAlerts}
            onChange={(e) => setBudgetAlerts(e.target.checked)}
          />
          Budget alerts
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={recurringOn}
            onChange={(e) => setRecurringOn(e.target.checked)}
          />
          Recurring reminders
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="thr">Budget alert threshold (%)</Label>
          <Input
            id="thr"
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
