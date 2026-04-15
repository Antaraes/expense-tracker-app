-- Same UUID as migrations/20260103000011_seed_demo_data.sql (demo@ultrafinance.local).
-- Safe if row missing: no-op.

UPDATE public.profiles
SET role = 'superadmin'
WHERE id = 'a0000000-0000-0000-0000-000000000001';
