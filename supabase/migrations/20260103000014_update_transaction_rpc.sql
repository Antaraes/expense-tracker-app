-- Replace transaction header and lines atomically (same rules as create_transaction).

CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id UUID,
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
  v_line JSONB;
  v_sum NUMERIC := 0;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = p_transaction_id AND t.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
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

REVOKE ALL ON FUNCTION public.update_transaction(UUID, TEXT, UUID, TEXT, TEXT, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction(UUID, TEXT, UUID, TEXT, TEXT, DATE, JSONB) TO authenticated;
