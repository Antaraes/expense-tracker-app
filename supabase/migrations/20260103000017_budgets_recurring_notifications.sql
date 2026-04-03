-- Budgets, recurring rules, in-app notification rows, profile notification prefs.
-- Desktop push uses the browser Notification API in the client; optional Realtime on user_notifications.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS budget_alert_threshold_pct smallint NOT NULL DEFAULT 80
    CHECK (budget_alert_threshold_pct BETWEEN 1 AND 100);

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, year_month)
);

CREATE INDEX idx_budgets_user_month ON public.budgets (user_id, year_month);

CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval_n integer NOT NULL DEFAULT 1 CHECK (interval_n >= 1 AND interval_n <= 365),
  next_run_date date NOT NULL,
  end_date date,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description text,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL REFERENCES public.currencies(code),
  exchange_rate numeric NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  is_active boolean NOT NULL DEFAULT true,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_user_next ON public.recurring_rules (user_id, next_run_date) WHERE is_active;

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notifications_user_created ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_own ON public.budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_own ON public.recurring_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_own ON public.user_notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.compute_next_run_date(p_from date, p_freq text, p_interval_n int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_freq = 'daily' THEN
    RETURN (p_from + make_interval(days => p_interval_n))::date;
  ELSIF p_freq = 'weekly' THEN
    RETURN (p_from + make_interval(days => 7 * p_interval_n))::date;
  ELSIF p_freq = 'monthly' THEN
    RETURN (p_from + (p_interval_n || ' month')::interval)::date;
  END IF;
  RETURN p_from;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_my_recurring_rules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
  r RECORD;
  v_signed numeric;
  v_lines jsonb;
  v_next date;
  v_txn uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR r IN
    SELECT * FROM public.recurring_rules
    WHERE user_id = v_uid AND is_active
      AND (end_date IS NULL OR next_run_date <= end_date)
  LOOP
    WHILE r.is_active
      AND r.next_run_date <= CURRENT_DATE
      AND (r.end_date IS NULL OR r.next_run_date <= r.end_date)
    LOOP
      v_signed := CASE WHEN r.type = 'expense' THEN -r.amount ELSE r.amount END;
      v_lines := jsonb_build_array(
        jsonb_build_object(
          'account_id', r.account_id,
          'amount', v_signed,
          'currency_code', r.currency_code,
          'exchange_rate', r.exchange_rate
        )
      );

      SELECT public.create_transaction(
        r.type::text,
        r.category_id,
        r.description,
        NULL::text,
        r.next_run_date,
        v_lines
      ) INTO v_txn;

      INSERT INTO public.user_notifications (user_id, title, body)
      VALUES (
        v_uid,
        'Recurring transaction',
        COALESCE(NULLIF(trim(r.description), ''), r.type) || ' — ' || to_char(r.next_run_date, 'YYYY-MM-DD')
      );

      v_next := public.compute_next_run_date(r.next_run_date, r.frequency, r.interval_n);

      UPDATE public.recurring_rules
      SET
        next_run_date = v_next,
        last_generated_at = now(),
        updated_at = now()
      WHERE id = r.id;

      r.next_run_date := v_next;
      v_count := v_count + 1;

      IF v_count > 500 THEN
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_my_recurring_rules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_my_recurring_rules() TO authenticated;

REVOKE ALL ON FUNCTION public.compute_next_run_date(date, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_next_run_date(date, text, integer) TO authenticated;

-- Realtime: enable replication for public.user_notifications in Supabase Dashboard → Database → Publications (or Realtime settings).

CREATE OR REPLACE FUNCTION public.wipe_user_finance_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_notifications WHERE user_id = uid;
  DELETE FROM public.budgets WHERE user_id = uid;
  DELETE FROM public.recurring_rules WHERE user_id = uid;
  DELETE FROM public.transactions WHERE user_id = uid;
  DELETE FROM public.accounts WHERE user_id = uid;
  DELETE FROM public.categories WHERE user_id = uid AND is_system = false;

  UPDATE public.profiles
  SET default_account_id = NULL, updated_at = now()
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.wipe_user_finance_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipe_user_finance_data() TO authenticated;
