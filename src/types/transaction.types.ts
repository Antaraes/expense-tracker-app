export type TransactionType = "expense" | "income" | "transfer";

export interface CreateTransactionLineInput {
  account_id: string;
  amount: number;
  currency_code: string;
  exchange_rate: number;
}
