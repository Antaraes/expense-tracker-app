-- Optional default account for new transactions / preferences.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.default_account_id IS 'User preference; must belong to same user (enforced in app).';
