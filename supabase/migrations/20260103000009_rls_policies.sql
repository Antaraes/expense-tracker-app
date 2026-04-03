-- Row Level Security — all user data isolated by auth.uid()

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Currencies: read active rows
CREATE POLICY "currencies_select"
  ON public.currencies FOR SELECT TO authenticated
  USING (is_active = true);

-- Profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Accounts
CREATE POLICY "accounts_all_own"
  ON public.accounts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Categories: own + system defaults
CREATE POLICY "categories_select"
  ON public.categories FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "categories_insert_custom"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "categories_update_own"
  ON public.categories FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "categories_delete_own"
  ON public.categories FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND is_system = false);

-- Transactions
CREATE POLICY "transactions_all_own"
  ON public.transactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Transaction lines (via parent transaction + account ownership)
CREATE POLICY "transaction_lines_select"
  ON public.transaction_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_lines_insert"
  ON public.transaction_lines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = transaction_lines.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_lines_update"
  ON public.transaction_lines FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = transaction_lines.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_lines_delete"
  ON public.transaction_lines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.user_id = auth.uid()
    )
  );

-- Exchange rates: read-only for authenticated
CREATE POLICY "exchange_rates_select"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (true);
