import { embedSingle } from "@/lib/utils";
import type { TransactionType } from "@/types/transaction.types";

export type TransactionFormInitial = {
  kind: TransactionType;
  date: string;
  description: string;
  notes: string;
  categoryId: string;
  accountId: string;
  accountFromId: string;
  accountToId: string;
  amount: string;
  amountInDest: string;
};

type Line = {
  amount: string;
  currency_code: string;
  exchange_rate: string;
  accounts: unknown;
};

export function parseTransactionForForm(tx: {
  type: string;
  date: string;
  description: string | null;
  notes: string | null;
  category_id: string | null;
  transaction_lines: Line[] | null;
}): TransactionFormInitial {
  const lines = tx.transaction_lines ?? [];
  const notes = tx.notes ?? "";
  const description = tx.description ?? "";
  const kind = tx.type as TransactionType;

  if (kind === "expense" || kind === "income") {
    const l = lines[0];
    const accId = embedSingle<{ id: string }>(l?.accounts)?.id ?? "";
    const amt = l ? Math.abs(Number(l.amount)) : 0;
    return {
      kind,
      date: tx.date,
      description,
      notes,
      categoryId: tx.category_id ?? "",
      accountId: accId,
      accountFromId: accId,
      accountToId: accId,
      amount: amt ? String(amt) : "",
      amountInDest: "",
    };
  }

  const neg = lines.find((l) => Number(l.amount) < 0);
  const pos = lines.find((l) => Number(l.amount) > 0);
  const from = embedSingle<{ id: string }>(neg?.accounts)?.id ?? "";
  const to = embedSingle<{ id: string }>(pos?.accounts)?.id ?? "";
  const fromAmt = neg ? Math.abs(Number(neg.amount)) : 0;
  const sameCcy =
    neg && pos && neg.currency_code === pos.currency_code;

  if (sameCcy) {
    return {
      kind: "transfer",
      date: tx.date,
      description,
      notes,
      categoryId: "",
      accountId: "",
      accountFromId: from,
      accountToId: to,
      amount: fromAmt ? String(fromAmt) : "",
      amountInDest: "",
    };
  }

  const destAmt = pos ? Number(pos.amount) : 0;
  return {
    kind: "transfer",
    date: tx.date,
    description,
    notes,
    categoryId: "",
    accountId: "",
    accountFromId: from,
    accountToId: to,
    amount: fromAmt ? String(fromAmt) : "",
    amountInDest: destAmt ? String(destAmt) : "",
  };
}
