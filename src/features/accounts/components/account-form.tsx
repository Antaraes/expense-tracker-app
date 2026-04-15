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
import { accountService } from "@/features/accounts/services/accounts.service";

type AccountType = "bank" | "e_wallet" | "cash" | "credit_card";

type CurrencyRow = { code: string; name: string };

const TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "e_wallet", label: "E-wallet" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
];

export function AccountForm({
  mode,
  accountId,
  currencies,
  initial,
}: {
  mode: "create" | "edit";
  accountId?: string;
  currencies: CurrencyRow[];
  initial?: {
    name: string;
    type: AccountType;
    default_currency: string;
    icon: string | null;
    color: string | null;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "bank");
  const [currency, setCurrency] = useState(
    initial?.default_currency ?? currencies[0]?.code ?? "THB"
  );
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6C5CE7");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    setLoading(true);
    if (mode === "create") {
      const { data, error } = await accountService.create({
        name: name.trim(),
        type,
        default_currency: currency,
        icon: icon.trim() || null,
        color: color || null,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account created.");
      if (data?.id) router.push(`/accounts/${data.id}`);
      else router.push("/accounts");
      router.refresh();
      return;
    }

    if (!accountId) {
      setLoading(false);
      return;
    }
    const { error } = await accountService.update(accountId, {
      name: name.trim(),
      type,
      default_currency: currency,
      icon: icon.trim() || null,
      color: color || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account updated.");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">Name</Label>
        <Input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-icon">Icon (optional Lucide name)</Label>
        <Input
          id="acc-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g. wallet"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-color">Color</Label>
        <Input
          id="acc-color"
          type="color"
          className="h-9 w-20 p-1"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : mode === "create" ? "Create account" : "Save changes"}
      </Button>
    </form>
  );
}
