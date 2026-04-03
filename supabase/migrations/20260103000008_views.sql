CREATE OR REPLACE VIEW public.account_balances
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.default_currency,
  COALESCE(SUM(tl.amount), 0)::NUMERIC(19,4) AS balance,
  COALESCE(SUM(tl.base_amount), 0)::NUMERIC(19,4) AS base_balance
FROM public.accounts a
LEFT JOIN public.transaction_lines tl ON tl.account_id = a.id
WHERE a.is_archived = false
GROUP BY a.id, a.user_id, a.name, a.type, a.default_currency;
