-- Global currency lookup (must exist before profiles.default_currency)

CREATE TABLE public.currencies (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  decimal_places  INTEGER NOT NULL DEFAULT 2,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.currencies (code, name, symbol, decimal_places) VALUES
  ('THB', 'Thai Baht', '฿', 2),
  ('USD', 'US Dollar', '$', 2),
  ('MMK', 'Myanmar Kyat', 'K', 0);
