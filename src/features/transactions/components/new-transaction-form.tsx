"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
import type { TransactionFormInitial } from "@/features/transactions/lib/parse-transaction-for-form";
import { transactionService } from "@/features/transactions/services/transactions.service";

type Acc = { id: string; name: string; type: string; default_currency: string };
type Cat = { id: string; name: string; type: string; icon: string | null; color: string | null };

function defaultAccountId(accounts: Acc[], pref: string | null) {
  if (pref && accounts.some((a) => a.id === pref)) return pref;
  return accounts[0]?.id ?? null;
}

export function NewTransactionForm({
  accounts,
  categories,
  baseCurrency,
  defaultAccountId: prefDefaultAccount,
  editTransactionId,
  initial,
}: {
  accounts: Acc[];
  categories: Cat[];
  baseCurrency: string;
  defaultAccountId: string | null;
  editTransactionId?: string;
  initial?: TransactionFormInitial;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<"expense" | "income" | "transfer">(
    () => initial?.type ?? "expense"
  );
  const [date, setDate] = useState(() => initial?.date ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(() => initial?.description ?? "");
  const [notes, setNotes] = useState(() => initial?.notes ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    () => initial?.categoryId ?? null
  );

  const [accountId, setAccountId] = useState<string | null>(() => {
    if (initial && initial.type !== "transfer") return initial.accountId;
    return defaultAccountId(accounts, prefDefaultAccount);
  });
  const [amountStr, setAmountStr] = useState(() =>
    initial && initial.type !== "transfer"
      ? String(initial.amountPositive || "")
      : ""
  );

  const [transferFrom, setTransferFrom] = useState<string | null>(
    () => initial?.transferFromAccountId ?? null
  );
  const [transferTo, setTransferTo] = useState<string | null>(
    () => initial?.transferToAccountId ?? null
  );
  const [transferAmtStr, setTransferAmtStr] = useState(() =>
    initial?.type === "transfer" ? String(initial.transferAmount || "") : ""
  );

  const [rate, setRate] = useState<number | null>(() =>
    initial && initial.type !== "transfer" ? initial.exchangeRate : 1
  );

  const acc = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId]
  );

  const refreshRate = useCallback(async () => {
    if (type === "transfer" || !acc) return;
    const r = await exchangeRatesService.resolveLineRateToBase(
      acc.default_currency,
      baseCurrency,
      date
    );
    setRate(r);
  }, [acc, baseCurrency, date, type]);

  useEffect(() => {
    void refreshRate();
  }, [refreshRate]);

  const categoryOptions = useMemo(() => {
    if (type === "expense") return categories.filter((c) => c.type === "expense" || c.type === "both");
    if (type === "income") return categories.filter((c) => c.type === "income" || c.type === "both");
    return [];
  }, [categories, type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (accounts.length === 0) {
      toast.error("Create an account first.");
      return;
    }

    const amt = Number.parseFloat(type === "transfer" ? transferAmtStr : amountStr);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }

    if (type !== "transfer") {
      if (!categoryId) {
        toast.error("Choose a category.");
        return;
      }
      if (!accountId) {
        toast.error("Choose an account.");
        return;
      }
      const a = accounts.find((x) => x.id === accountId);
      if (!a) return;
      const r = await exchangeRatesService.resolveLineRateToBase(
        a.default_currency,
        baseCurrency,
        date
      );
      if (r == null || !Number.isFinite(r) || r <= 0) {
        toast.error(
          "Missing FX rate — save a pair in Settings → Exchange rates for this currency and date."
        );
        return;
      }
      const signed = type === "expense" ? -amt : amt;
      const lines = [
        {
          account_id: accountId,
          amount: signed,
          currency_code: a.default_currency,
          exchange_rate: r,
        },
      ];

      setLoading(true);
      const fn = editTransactionId
        ? transactionService.update(editTransactionId, {
            type,
            categoryId,
            description: description.trim() || null,
            notes: notes.trim() || null,
            date,
            lines,
          })
        : transactionService.create({
            type,
            categoryId,
            description: description.trim() || null,
            notes: notes.trim() || null,
            date,
            lines,
          });
      const { error } = await fn;
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(editTransactionId ? "Transaction updated." : "Transaction saved.");
      router.push("/transactions");
      router.refresh();
      return;
    }

    if (!transferFrom || !transferTo) {
      toast.error("Choose both accounts for a transfer.");
      return;
    }
    if (transferFrom === transferTo) {
      toast.error("Pick two different accounts.");
      return;
    }
    const fa = accounts.find((x) => x.id === transferFrom);
    const ta = accounts.find((x) => x.id === transferTo);
    if (!fa || !ta) return;
    if (fa.default_currency !== ta.default_currency) {
      toast.error("Transfers must use two accounts with the same default currency.");
      return;
    }
    const ccy = fa.default_currency;
    const lines = [
      {
        account_id: transferFrom,
        amount: -amt,
        currency_code: ccy,
        exchange_rate: 1,
      },
      {
        account_id: transferTo,
        amount: amt,
        currency_code: ccy,
        exchange_rate: 1,
      },
    ];

    setLoading(true);
    const fn = editTransactionId
      ? transactionService.update(editTransactionId, {
          type: "transfer",
          categoryId: null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          date,
          lines,
        })
      : transactionService.create({
          type: "transfer",
          categoryId: null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          date,
          lines,
        });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editTransactionId ? "Transfer updated." : "Transfer saved.");
    router.push("/transactions");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              const nt = v as typeof type;
              setType(nt);
              if (nt === "transfer") setCategoryId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Date</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-desc">Description</Label>
        <Input
          id="tx-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this?"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-notes">Notes (optional)</Label>
        <Input
          id="tx-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {type !== "transfer" ? (
        <>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={categoryId ?? ""}
              onValueChange={(v) => setCategoryId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select value={accountId ?? ""} onValueChange={(v) => setAccountId(v || null)}>
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
          <div className="space-y-1.5">
            <Label htmlFor="tx-amt">Amount ({acc?.default_currency ?? "—"})</Label>
            <Input
              id="tx-amt"
              type="number"
              step="0.01"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Base ({baseCurrency}) rate for this date:{" "}
              <span className="font-mono tabular-nums">
                {rate != null ? rate.toFixed(6) : "—"}
              </span>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select value={transferFrom ?? ""} onValueChange={(v) => setTransferFrom(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="From" />
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
            <div className="space-y-1.5">
              <Label>To account</Label>
              <Select value={transferTo ?? ""} onValueChange={(v) => setTransferTo(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="To" />
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-tr-amt">Amount (same currency on both accounts)</Label>
            <Input
              id="tx-tr-amt"
              type="number"
              step="0.01"
              min="0"
              value={transferAmtStr}
              onChange={(e) => setTransferAmtStr(e.target.value)}
              required
            />
          </div>
        </>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : editTransactionId ? "Save changes" : "Save transaction"}
      </Button>
    </form>
  );
}
