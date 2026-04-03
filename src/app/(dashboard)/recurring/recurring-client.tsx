"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recurringService } from "@/features/recurring/services/recurring.service";
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { embedSingle } from "@/lib/utils";

type Rule = {
  id: string;
  frequency: string;
  interval_n: number;
  next_run_date: string;
  end_date: string | null;
  type: string;
  description: string | null;
  amount: string;
  is_active: boolean;
  categories: unknown;
  accounts: unknown;
};

type Account = { id: string; name: string; default_currency: string };
type Category = { id: string; name: string; type: string };

export function RecurringClient({
  rules,
  accounts,
  categories,
  baseCurrency,
}: {
  rules: Rule[];
  accounts: Account[];
  categories: Category[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    "monthly"
  );
  const [intervalN, setIntervalN] = useState("1");
  const [nextRun, setNextRun] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const filteredCats = categories.filter((c) =>
    txType === "expense"
      ? c.type === "expense" || c.type === "both"
      : c.type === "income" || c.type === "both"
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const acc = accounts.find((a) => a.id === accountId);
    const amt = Number.parseFloat(amount);
    const intv = Math.max(1, Number.parseInt(intervalN, 10) || 1);
    if (!acc || !categoryId || Number.isNaN(amt) || amt <= 0) {
      setMsg("Fill account, category, and a positive amount.");
      return;
    }
    setLoading(true);
    const rate = await exchangeRatesService.resolveLineRateToBase(
      acc.default_currency,
      baseCurrency,
      nextRun
    );
    const { error } = await recurringService.create({
      frequency,
      interval_n: intv,
      next_run_date: nextRun,
      end_date: endDate.trim() ? endDate : null,
      type: txType,
      category_id: categoryId,
      description: description.trim() || null,
      account_id: acc.id,
      amount: amt,
      currency_code: acc.default_currency,
      exchange_rate: rate,
    });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setDescription("");
    setAmount("");
    router.refresh();
  }

  async function toggleActive(id: string, is_active: boolean) {
    setLoading(true);
    const { error } = await recurringService.setActive(id, !is_active);
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this recurring rule?")) return;
    setLoading(true);
    const { error } = await recurringService.remove(id);
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
  }

  async function runNow() {
    setMsg(null);
    setLoading(true);
    const { data, error } = await recurringService.processDue();
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(
      typeof data === "number"
        ? `Processed ${data} scheduled posting(s).`
        : "Done."
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recurring transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Income or expense on a schedule. Due items are posted when you open the
            app or when you click Run now.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void runNow()}
        >
          Run due now
        </Button>
      </div>

      {msg ? (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}

      <Card className="border-border">
        <CardHeader>
          <CardTitle>New recurring rule</CardTitle>
          <CardDescription>
            Uses the same ledger rules as manual transactions. Exchange rate is
            resolved from your rates table for the start date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void onCreate(e)}
            className="grid max-w-xl gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={txType}
                onValueChange={(v) => {
                  setTxType(v as "expense" | "income");
                  setCategoryId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setFrequency(v as "daily" | "weekly" | "monthly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intv">Every (interval)</Label>
              <Input
                id="intv"
                type="number"
                min={1}
                value={intervalN}
                onChange={(e) => setIntervalN(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr">Next run date</Label>
              <Input
                id="nr"
                type="date"
                value={nextRun}
                onChange={(e) => setNextRun(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed">End date (optional)</Label>
              <Input
                id="ed"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.default_currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (positive)</Label>
              <Input
                id="amt"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Create recurring rule"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Your rules</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Active</th>
                <th className="pb-2 pr-2 font-medium">Next</th>
                <th className="pb-2 pr-2 font-medium">Freq</th>
                <th className="pb-2 pr-2 font-medium">Type</th>
                <th className="pb-2 pr-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const cat = embedSingle<{ name: string }>(r.categories);
                const acc = embedSingle<{ name: string }>(r.accounts);
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={r.is_active}
                        onChange={() => void toggleActive(r.id, r.is_active)}
                      />
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs">
                      {r.next_run_date}
                    </td>
                    <td className="py-2 pr-2">
                      {r.frequency} ×{r.interval_n}
                    </td>
                    <td className="py-2 pr-2">{r.type}</td>
                    <td className="py-2 pr-2 font-mono">
                      {r.amount} {cat?.name ? `· ${cat.name}` : ""}{" "}
                      {acc?.name ? `· ${acc.name}` : ""}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void remove(r.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recurring rules yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
