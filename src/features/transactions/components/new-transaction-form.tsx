"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transactionService } from "@/features/transactions/services/transactions.service";
import { exchangeRatesService } from "@/features/currencies/services/exchange-rates.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TransactionFormInitial } from "@/features/transactions/lib/parse-transaction-for-form";
import type { TransactionType } from "@/types/transaction.types";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  default_currency: string;
};

type CategoryRow = {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
};

export function NewTransactionForm({
  accounts,
  categories,
  baseCurrency,
  defaultAccountId,
  editTransactionId,
  initial,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  baseCurrency: string;
  defaultAccountId?: string | null;
  editTransactionId?: string;
  initial?: TransactionFormInitial;
}) {
  const router = useRouter();
  const pickDefaultAcct =
    accounts.find((a) => a.id === defaultAccountId)?.id ??
    accounts[0]?.id ??
    "";
  const [kind, setKind] = useState<TransactionType>(
    initial?.kind ?? "expense"
  );
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId || pickDefaultAcct
  );
  const [accountFromId, setAccountFromId] = useState(
    initial?.accountFromId || accounts[0]?.id || ""
  );
  const [accountToId, setAccountToId] = useState(
    initial?.accountToId ||
      accounts[1]?.id ||
      accounts[0]?.id ||
      ""
  );
  const [amount, setAmount] = useState(initial?.amount ?? "");
  /** Cross-currency transfer: amount received in destination currency */
  const [amountInDest, setAmountInDest] = useState(initial?.amountInDest ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCategories = useMemo(() => {
    if (kind === "expense")
      return categories.filter((c) => c.type === "expense" || c.type === "both");
    if (kind === "income")
      return categories.filter((c) => c.type === "income" || c.type === "both");
    return [];
  }, [categories, kind]);

  const fromAcc = accounts.find((a) => a.id === accountFromId);
  const toAcc = accounts.find((a) => a.id === accountToId);
  const singleAcc = accounts.find((a) => a.id === accountId);

  async function resolveRate(
    lineCurrency: string,
    onDate: string
  ): Promise<number> {
    return exchangeRatesService.resolveLineRateToBase(
      lineCurrency,
      baseCurrency,
      onDate
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number.parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    setLoading(true);
    try {
      if (kind === "expense" || kind === "income") {
        if (!singleAcc) {
          setError("Select an account.");
          return;
        }
        if (!categoryId) {
          setError("Select a category.");
          return;
        }
        const rate = await resolveRate(singleAcc.default_currency, date);
        const signed = kind === "expense" ? -amt : amt;
        const lines = [
          {
            account_id: singleAcc.id,
            amount: signed,
            currency_code: singleAcc.default_currency,
            exchange_rate: rate,
          },
        ];
        const payload = {
          type: kind,
          categoryId,
          description: description || null,
          notes: notes || null,
          date,
          lines,
        };
        const { error: err, data } = editTransactionId
          ? await transactionService.update(editTransactionId, payload)
          : await transactionService.create(payload);
        if (err) {
          setError(err.message);
          return;
        }
        const id =
          typeof data === "string"
            ? data
            : editTransactionId ?? null;
        router.push(id ? `/transactions/${id}` : "/transactions");
        router.refresh();
        return;
      }

      if (!fromAcc || !toAcc) {
        setError("Select both accounts.");
        return;
      }
      if (fromAcc.id === toAcc.id) {
        setError("Choose two different accounts.");
        return;
      }

      if (fromAcc.default_currency === toAcc.default_currency) {
        const rate = await resolveRate(fromAcc.default_currency, date);
        const lines = [
          {
            account_id: fromAcc.id,
            amount: -amt,
            currency_code: fromAcc.default_currency,
            exchange_rate: rate,
          },
          {
            account_id: toAcc.id,
            amount: amt,
            currency_code: toAcc.default_currency,
            exchange_rate: rate,
          },
        ];
        const payload = {
          type: "transfer" as const,
          categoryId: null,
          description: description || null,
          notes: notes || null,
          date,
          lines,
        };
        const { error: err, data } = editTransactionId
          ? await transactionService.update(editTransactionId, payload)
          : await transactionService.create(payload);
        if (err) {
          setError(err.message);
          return;
        }
        const id =
          typeof data === "string"
            ? data
            : editTransactionId ?? null;
        router.push(id ? `/transactions/${id}` : "/transactions");
        router.refresh();
        return;
      }

      const destAmt = Number.parseFloat(amountInDest);
      if (Number.isNaN(destAmt) || destAmt <= 0) {
        setError("Enter amount received in the destination currency.");
        return;
      }
      const rFrom = await resolveRate(fromAcc.default_currency, date);
      const rTo = await resolveRate(toAcc.default_currency, date);
      const baseOut = amt * rFrom;
      const baseIn = destAmt * rTo;
      if (Math.abs(baseOut - baseIn) > 1.0) {
        setError(
          `Cross-currency transfer must balance in ${baseCurrency} (within 1.00). Check amounts vs exchange rates.`
        );
        return;
      }
      const lines = [
        {
          account_id: fromAcc.id,
          amount: -amt,
          currency_code: fromAcc.default_currency,
          exchange_rate: rFrom,
        },
        {
          account_id: toAcc.id,
          amount: destAmt,
          currency_code: toAcc.default_currency,
          exchange_rate: rTo,
        },
      ];
      const payload = {
        type: "transfer" as const,
        categoryId: null,
        description: description || null,
        notes: notes || null,
        date,
        lines,
      };
      const { error: err, data } = editTransactionId
        ? await transactionService.update(editTransactionId, payload)
        : await transactionService.create(payload);
      if (err) {
        setError(err.message);
        return;
      }
      const id =
        typeof data === "string" ? data : editTransactionId ?? null;
      router.push(id ? `/transactions/${id}` : "/transactions");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl border-border">
      <CardHeader>
        <CardTitle>
          {editTransactionId ? "Edit transaction" : "New transaction"}
        </CardTitle>
        <CardDescription>
          Expense / income use one ledger line; transfers use two balanced lines.
          Base currency:{" "}
          <span className="font-mono tabular-nums">{baseCurrency}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as TransactionType)
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {kind !== "transfer" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="cat">Category</Label>
                <select
                  id="cat"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acct">Account</Label>
                <select
                  id="acct"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.default_currency})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <select
                    id="from"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={accountFromId}
                    onChange={(e) => setAccountFromId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.default_currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <select
                    id="to"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={accountToId}
                    onChange={(e) => setAccountToId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.default_currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {fromAcc &&
                toAcc &&
                fromAcc.default_currency !== toAcc.default_currency && (
                  <p className="text-xs text-muted-foreground">
                    Cross-currency: enter amount sent (from account currency) and
                    amount received (destination currency). They must match your
                    base currency valuation (±1.00 {baseCurrency}).
                  </p>
                )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="amt">
              {kind === "transfer" &&
              fromAcc &&
              toAcc &&
              fromAcc.default_currency !== toAcc.default_currency
                ? `Amount out (${fromAcc.default_currency})`
                : "Amount"}
            </Label>
            <Input
              id="amt"
              className="font-mono tabular-nums"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {kind === "transfer" &&
            fromAcc &&
            toAcc &&
            fromAcc.default_currency !== toAcc.default_currency && (
              <div className="space-y-2">
                <Label htmlFor="amt2">
                  Amount in ({toAcc.default_currency})
                </Label>
                <Input
                  id="amt2"
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={amountInDest}
                  onChange={(e) => setAmountInDest(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link
                href={
                  editTransactionId
                    ? `/transactions/${editTransactionId}`
                    : "/transactions"
                }
              >
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
