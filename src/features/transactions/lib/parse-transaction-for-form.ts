import { embedSingle } from "@/lib/utils";

export type TransactionFormInitial = {
  type: "expense" | "income" | "transfer";
  date: string;
  description: string;
  notes: string;
  categoryId: string | null;
  /** Transfer: two signed lines. Expense/income: one line with positive UI amount. */
  transferFromAccountId: string | null;
  transferToAccountId: string | null;
  transferAmount: number;
  accountId: string | null;
  amountPositive: number;
  currencyCode: string;
  exchangeRate: number;
};

type TxLine = {
  amount: string;
  currency_code: string;
  exchange_rate: string;
  accounts: unknown;
};

export function parseTransactionForForm(tx: {
  type: string;
  category_id: string | null;
  description: string | null;
  notes: string | null;
  date: string;
  transaction_lines: TxLine[] | null;
}): TransactionFormInitial {
  const lines = tx.transaction_lines ?? [];
  const t = tx.type as TransactionFormInitial["type"];

  if (t === "transfer" && lines.length >= 2) {
    const sorted = [...lines].sort(
      (a, b) => Number(a.amount) - Number(b.amount)
    );
    const out = sorted[0];
    const inn = sorted[sorted.length - 1];
    const outAcc = embedSingle<{ id: string }>(out?.accounts);
    const inAcc = embedSingle<{ id: string }>(inn?.accounts);
    const amt = Math.abs(Number(out?.amount ?? 0));
    return {
      type: "transfer",
      date: tx.date,
      description: tx.description ?? "",
      notes: tx.notes ?? "",
      categoryId: null,
      transferFromAccountId: outAcc?.id ?? null,
      transferToAccountId: inAcc?.id ?? null,
      transferAmount: amt,
      accountId: null,
      amountPositive: 0,
      currencyCode: out?.currency_code ?? "THB",
      exchangeRate: 1,
    };
  }

  const line = lines[0];
  const acc = embedSingle<{ id: string; default_currency: string }>(
    line?.accounts
  );
  const raw = Number(line?.amount ?? 0);
  const uiAmount = t === "expense" ? Math.abs(raw) : Math.abs(raw);

  return {
    type: t,
    date: tx.date,
    description: tx.description ?? "",
    notes: tx.notes ?? "",
    categoryId: tx.category_id,
    transferFromAccountId: null,
    transferToAccountId: null,
    transferAmount: 0,
    accountId: acc?.id ?? null,
    amountPositive: uiAmount,
    currencyCode: line?.currency_code ?? acc?.default_currency ?? "THB",
    exchangeRate: Number(line?.exchange_rate ?? 1),
  };
}
