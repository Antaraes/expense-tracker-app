"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { budgetsService } from "@/features/budgets/services/budgets.service";
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
import type { CategoryExpenseRow } from "@/features/reports/queries.server";
import { formatCurrencyCode } from "@/lib/currency";

type BudgetRow = {
  id: string;
  category_id: string;
  amount: string;
  categories: { name: string } | { name: string }[] | null;
};

type Cat = { id: string; name: string; type: string };

export function BudgetsClient({
  yearMonth,
  baseCurrency,
  budgets,
  spendRows,
  expenseCategories,
}: {
  yearMonth: string;
  baseCurrency: string;
  budgets: BudgetRow[] | null;
  spendRows: CategoryExpenseRow[];
  expenseCategories: Cat[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const spendByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of spendRows) {
      m.set(r.categoryId, r.total);
    }
    return m;
  }, [spendRows]);

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const amt = Number.parseFloat(amount);
    if (!categoryId || Number.isNaN(amt) || amt <= 0) {
      setMsg("Choose a category and a positive amount.");
      return;
    }
    setLoading(true);
    const { error } = await budgetsService.upsert({
      category_id: categoryId,
      year_month: yearMonth,
      amount: amt,
    });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setAmount("");
    setCategoryId("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this budget?")) return;
    setLoading(true);
    const { error } = await budgetsService.remove(id);
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
  }

  const prev = shiftMonth(yearMonth, -1);
  const next = shiftMonth(yearMonth, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Monthly caps per category (base currency: {baseCurrency}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/budgets?month=${prev}`}>Previous</Link>
          </Button>
          <span className="font-mono text-sm">{yearMonth}</span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/budgets?month=${next}`}>Next</Link>
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Add / update budget</CardTitle>
          <CardDescription>
            One budget per category per month. Amounts are in your base currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void addBudget(e)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-amt">Budget amount</Label>
              <Input
                id="b-amt"
                type="number"
                step="0.01"
                min="0"
                className="w-36"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save budget"}
            </Button>
          </form>
          {msg ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {msg}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 font-medium">Budget</th>
                <th className="pb-2 pr-4 font-medium">Spent</th>
                <th className="pb-2 pr-4 font-medium">Left</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(budgets ?? []).map((b) => {
                const cat = embedSingle<{ name: string }>(b.categories);
                const name = cat?.name ?? "Category";
                const cap = Number(b.amount);
                const spent = spendByCat.get(b.category_id) ?? 0;
                const left = cap - spent;
                const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
                return (
                  <tr key={b.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{name}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">
                      {formatCurrencyCode(cap, baseCurrency)}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums">
                      {formatCurrencyCode(spent, baseCurrency)}
                    </td>
                    <td
                      className={`py-2 pr-4 font-mono tabular-nums ${
                        left < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {formatCurrencyCode(left, baseCurrency)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void remove(b.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!budgets?.length ? (
            <p className="text-sm text-muted-foreground">No budgets for this month.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y!, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
