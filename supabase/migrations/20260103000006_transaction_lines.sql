CREATE TABLE public.transaction_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  amount          NUMERIC(19,4) NOT NULL,
  currency_code   TEXT NOT NULL REFERENCES public.currencies(code),
  exchange_rate   NUMERIC(15,6) NOT NULL DEFAULT 1.000000,
  base_amount     NUMERIC(19,4) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_lines_transaction ON public.transaction_lines(transaction_id);
CREATE INDEX idx_txn_lines_account ON public.transaction_lines(account_id);
