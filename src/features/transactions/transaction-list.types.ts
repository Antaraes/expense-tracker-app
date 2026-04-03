/** Row shape for the transactions list query (shared by server query + client table). */

export type TransactionRow = {
  id: string;
  type: string;
  description: string | null;
  date: string;
  category_id: string | null;
  categories: unknown;
  created_at: string;
  updated_at: string;
  transaction_lines: Array<{
    id: string;
    amount: string;
    currency_code: string;
    base_amount: string;
    exchange_rate: string;
    accounts: unknown;
  }>;
};
