CREATE TABLE public.exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   TEXT NOT NULL REFERENCES public.currencies(code),
  to_currency     TEXT NOT NULL REFERENCES public.currencies(code),
  rate            NUMERIC(15,6) NOT NULL,
  effective_date  DATE NOT NULL,
  source          TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX idx_exchange_rates_lookup
  ON public.exchange_rates(from_currency, to_currency, effective_date DESC);
