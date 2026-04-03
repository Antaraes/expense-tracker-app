-- Demo dataset: one login + two currency wallets (THB + MMK) + rich THB/MMK activity.
-- Login: demo@ultrafinance.local / DemoSeed2026!
-- (One financial "account" per currency is required so MMK lines attach to an MMK account.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user        CONSTANT uuid := 'a0000000-0000-0000-0000-000000000001';
  v_account_thb CONSTANT uuid := 'b0000001-0000-0000-0000-000000000001';
  v_account_mmk CONSTANT uuid := 'b0000002-0000-0000-0000-000000000001';
  v_cat_food    uuid;
  v_cat_trans   uuid;
  v_cat_shop    uuid;
  v_cat_salary  uuid;
  v_cat_free    uuid;
  v_txn         uuid;
  v_amt         numeric;
  v_base        numeric;
  v_rate_mmk    numeric := 0.0105263158; -- ~1/95 THB per 1 MMK
  i             int;
  d             date;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user) THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user,
    'authenticated',
    'authenticated',
    'demo@ultrafinance.local',
    extensions.crypt('DemoSeed2026!'::text, extensions.gen_salt('bf'::text)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user,
    v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', 'demo@ultrafinance.local'),
    'email',
    now(),
    now(),
    now()
  );

  SELECT id INTO v_cat_food FROM public.categories WHERE name = 'Food & Drink' AND is_system LIMIT 1;
  SELECT id INTO v_cat_trans FROM public.categories WHERE name = 'Transport' AND is_system LIMIT 1;
  SELECT id INTO v_cat_shop FROM public.categories WHERE name = 'Shopping' AND is_system LIMIT 1;
  SELECT id INTO v_cat_salary FROM public.categories WHERE name = 'Salary' AND is_system LIMIT 1;
  SELECT id INTO v_cat_free FROM public.categories WHERE name = 'Freelance' AND is_system LIMIT 1;

  IF v_cat_food IS NULL OR v_cat_trans IS NULL OR v_cat_shop IS NULL OR v_cat_salary IS NULL OR v_cat_free IS NULL THEN
    RAISE EXCEPTION 'Seed requires system categories from migration 20260103000004_categories.sql';
  END IF;

  INSERT INTO public.accounts (
    id, user_id, name, type, default_currency, icon, color, sort_order
  ) VALUES
    (v_account_thb, v_user, 'Main THB', 'bank', 'THB', 'landmark', '#6C5CE7', 0),
    (v_account_mmk, v_user, 'MMK Wallet', 'e_wallet', 'MMK', 'wallet', '#00D68F', 1);

  -- Historical THB↔MMK reference rates (90 days)
  INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date, source)
  SELECT
    'THB',
    'MMK',
    (95.0 + (random() * 4 - 2))::numeric(15,6),
    (CURRENT_DATE - g)::date,
    'manual'
  FROM generate_series(0, 89) AS g;

  INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date, source)
  SELECT
    'MMK',
    'THB',
    (1.0 / (95.0 + (random() * 4 - 2)))::numeric(15,6),
    (CURRENT_DATE - g)::date,
    'manual'
  FROM generate_series(0, 89) AS g;

  -- THB expenses (45)
  FOR i IN 1..45 LOOP
    d := (CURRENT_DATE - (i % 88))::date;
    v_amt := (20 + (i * 13) % 480 + (random() * 50))::numeric(19,4);
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (
      v_user,
      'expense',
      (ARRAY[v_cat_food, v_cat_trans, v_cat_shop])[1 + (i % 3)],
      'THB expense seed #' || i,
      d
    )
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES (
      v_txn, v_account_thb, -v_amt, 'THB', 1.000000, -v_amt
    );
  END LOOP;

  -- MMK expenses (45)
  FOR i IN 1..45 LOOP
    d := (CURRENT_DATE - ((i + 17) % 88))::date;
    v_amt := (5000 + (i * 791) % 95000 + (random() * 2000))::numeric(19,4);
    v_base := round(v_amt * v_rate_mmk, 4);
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (
      v_user,
      'expense',
      (ARRAY[v_cat_food, v_cat_trans, v_cat_shop])[1 + (i % 3)],
      'MMK expense seed #' || i,
      d
    )
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES (
      v_txn, v_account_mmk, -v_amt, 'MMK', v_rate_mmk, -v_base
    );
  END LOOP;

  -- THB income (18)
  FOR i IN 1..18 LOOP
    d := (CURRENT_DATE - ((i + 3) % 60))::date;
    v_amt := (15000 + (i * 2000))::numeric(19,4);
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (v_user, 'income', v_cat_salary, 'Salary credit #' || i, d)
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES (
      v_txn, v_account_thb, v_amt, 'THB', 1.000000, v_amt
    );
  END LOOP;

  -- MMK income / freelance (18)
  FOR i IN 1..18 LOOP
    d := (CURRENT_DATE - ((i + 5) % 60))::date;
    v_amt := (80000 + (i * 15000))::numeric(19,4);
    v_base := round(v_amt * v_rate_mmk, 4);
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (v_user, 'income', v_cat_free, 'Freelance MMK #' || i, d)
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES (
      v_txn, v_account_mmk, v_amt, 'MMK', v_rate_mmk, v_base
    );
  END LOOP;

  -- Cross-currency transfers THB -> MMK (12)
  FOR i IN 1..12 LOOP
    d := (CURRENT_DATE - ((i + 11) % 40))::date;
    v_amt := (3000 + i * 500)::numeric(19,4);
    v_base := v_amt;
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (v_user, 'transfer', NULL, 'THB→MMK conversion #' || i, d)
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES
      (v_txn, v_account_thb, -v_amt, 'THB', 1.000000, -v_base),
      (
        v_txn,
        v_account_mmk,
        round(v_amt * 95, 4),
        'MMK',
        v_rate_mmk,
        v_base
      );
  END LOOP;

  -- Cross-currency transfers MMK -> THB (8)
  FOR i IN 1..8 LOOP
    d := (CURRENT_DATE - ((i + 19) % 35))::date;
    v_amt := (200000 + i * 25000)::numeric(19,4);
    v_base := round(v_amt * v_rate_mmk, 4);
    INSERT INTO public.transactions (user_id, type, category_id, description, date)
    VALUES (v_user, 'transfer', NULL, 'MMK→THB conversion #' || i, d)
    RETURNING id INTO v_txn;

    INSERT INTO public.transaction_lines (
      transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
    ) VALUES
      (v_txn, v_account_mmk, -v_amt, 'MMK', v_rate_mmk, -v_base),
      (v_txn, v_account_thb, v_base, 'THB', 1.000000, v_base);
  END LOOP;

END $$;
