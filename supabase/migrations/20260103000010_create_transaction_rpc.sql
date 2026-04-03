-- Atomic transaction creation; validates transfer balance. Uses auth.uid() — never trust client user id.

CREATE OR REPLACE FUNCTION public.create_transaction(
  p_type TEXT,
  p_category_id UUID,
  p_description TEXT,
  p_notes TEXT,
  p_date DATE,
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_id UUID;
  v_line JSONB;
  v_sum NUMERIC := 0;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_type NOT IN ('expense', 'income', 'transfer') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  INSERT INTO public.transactions (user_id, type, category_id, description, notes, date)
  VALUES (v_user_id, p_type, p_category_id, p_description, p_notes, p_date)
  RETURNING id INTO v_txn_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code,
      exchange_rate, base_amount
    ) VALUES (
      v_txn_id,
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

  RETURN v_txn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_transaction(TEXT, UUID, TEXT, TEXT, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_transaction(TEXT, UUID, TEXT, TEXT, DATE, JSONB) TO authenticated;
