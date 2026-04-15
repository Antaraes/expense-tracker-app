-- Doc 13: scheduled integrity scan (callable by service_role / cron API).
-- Optimistic concurrency on update_transaction (doc 13 offline / multi-writer mitigation).

CREATE OR REPLACE FUNCTION public.scan_imbalanced_transfers()
RETURNS TABLE (
  transaction_id uuid,
  user_id uuid,
  imbalance numeric,
  description text,
  txn_date date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.user_id,
    SUM(tl.base_amount)::numeric AS imbalance,
    t.description,
    t.date AS txn_date
  FROM public.transactions t
  JOIN public.transaction_lines tl ON tl.transaction_id = t.id
  WHERE t.type = 'transfer'
  GROUP BY t.id
  HAVING ABS(SUM(tl.base_amount)) > 0.01;
$$;

REVOKE ALL ON FUNCTION public.scan_imbalanced_transfers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_imbalanced_transfers() TO service_role;
GRANT EXECUTE ON FUNCTION public.scan_imbalanced_transfers() TO postgres;

COMMENT ON FUNCTION public.scan_imbalanced_transfers() IS
  'Returns transfer rows whose line base_amount sums exceed tolerance (doc 13).';

DROP FUNCTION IF EXISTS public.update_transaction(
  uuid, text, uuid, text, text, date, jsonb
);

CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id UUID,
  p_type TEXT,
  p_category_id UUID,
  p_description TEXT,
  p_notes TEXT,
  p_date DATE,
  p_lines JSONB,
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_sum NUMERIC := 0;
  v_user_id UUID := auth.uid();
  v_current_updated TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.updated_at INTO v_current_updated
  FROM public.transactions t
  WHERE t.id = p_transaction_id AND t.user_id = v_user_id;

  IF v_current_updated IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_current_updated IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Transaction was modified elsewhere. Refresh the page and try again.';
  END IF;

  IF p_type NOT IN ('expense', 'income', 'transfer') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  UPDATE public.transactions
  SET
    type = p_type,
    category_id = p_category_id,
    description = p_description,
    notes = p_notes,
    date = p_date,
    updated_at = now()
  WHERE id = p_transaction_id AND user_id = v_user_id;

  DELETE FROM public.transaction_lines WHERE transaction_id = p_transaction_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code,
      exchange_rate, base_amount
    ) VALUES (
      p_transaction_id,
      (v_line->>'account_id')::UUID,
      (v_line->>'amount')::NUMERIC,
      v_line->>'currency_code',
      (v_line->>'exchange_rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC * (v_line->>'exchange_rate')::NUMERIC
    );
    v_sum := v_sum
      + (v_line->>'amount')::NUMERIC * (v_line->>'exchange_rate')::NUMERIC;
  END LOOP;

  IF p_type = 'transfer' AND ABS(v_sum) > 0.01 THEN
    RAISE EXCEPTION 'Transfer transaction lines do not balance: %', v_sum;
  END IF;

  RETURN p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_transaction(UUID, TEXT, UUID, TEXT, TEXT, DATE, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction(UUID, TEXT, UUID, TEXT, TEXT, DATE, JSONB, TIMESTAMPTZ) TO authenticated;
