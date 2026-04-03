-- Remove all user-owned finance data (keeps auth user + profile row).

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
