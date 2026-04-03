"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { profilesService } from "@/features/profiles/services/profiles.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  base_currency: string;
  default_account_id: string | null;
};

type CurrencyOption = { code: string; name: string; symbol: string };

type AccountOption = { id: string; name: string };

export function SettingsForm({
  profile,
  currencies,
  accounts,
}: {
  profile: Profile | null;
  currencies: CurrencyOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [baseCurrency, setBaseCurrency] = useState(
    profile?.base_currency ?? "THB"
  );
  const [defaultAccountId, setDefaultAccountId] = useState(
    profile?.default_account_id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await profilesService.updateMine({
      display_name: displayName.trim() || null,
      base_currency: baseCurrency,
      default_account_id: defaultAccountId || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">You must be signed in.</p>
    );
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Reporting and dashboards use your base currency ({baseCurrency}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display">Display name</Label>
            <Input
              id="display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base">Base currency</Label>
            <select
              id="base"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="def-acct">Default account (new transactions)</Label>
            <select
              id="def-acct"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={defaultAccountId}
              onChange={(e) => setDefaultAccountId(e.target.value)}
            >
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
