"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  accountService,
  type AccountType,
} from "@/features/accounts/services/accounts.service";
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

type CurrencyOption = { code: string; name: string };

export function AccountForm({
  currencies,
  mode,
  accountId,
  initial,
}: {
  currencies: CurrencyOption[];
  mode: "create" | "edit";
  accountId?: string;
  initial?: {
    name: string;
    type: AccountType;
    default_currency: string;
    icon: string | null;
    color: string | null;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "bank");
  const [currency, setCurrency] = useState(
    initial?.default_currency ?? currencies[0]?.code ?? "THB"
  );
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6C5CE7");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setLoading(true);
    if (mode === "create") {
      const { error: err } = await accountService.create({
        name: name.trim(),
        type,
        default_currency: currency,
        icon: icon.trim() || null,
        color,
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/accounts");
      router.refresh();
      return;
    }
    if (!accountId) {
      setLoading(false);
      return;
    }
    const { error: err } = await accountService.update(accountId, {
      name: name.trim(),
      type,
      default_currency: currency,
      icon: icon.trim() || null,
      color,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>{mode === "create" ? "New account" : "Edit account"}</CardTitle>
        <CardDescription>
          Balances are always derived from ledger lines after you post transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-type">Type</Label>
            <select
              id="acc-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
            >
              <option value="bank">Bank</option>
              <option value="e_wallet">E-wallet</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit card</option>
            </select>
            {type === "credit_card" ? (
              <p className="text-xs text-muted-foreground">
                Credit cards can go negative when the ledger balance is below
                zero.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-ccy">Default currency</Label>
            <select
              id="acc-ccy"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-icon">Icon (optional)</Label>
            <Input
              id="acc-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. wallet, building-2 (lucide name)"
            />
            <p className="text-xs text-muted-foreground">
              Stored as text; you can map it in UI later.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-color">Color</Label>
            <Input
              id="acc-color"
              type="color"
              className="h-9 w-20 p-1"
              value={color ?? "#6C5CE7"}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
