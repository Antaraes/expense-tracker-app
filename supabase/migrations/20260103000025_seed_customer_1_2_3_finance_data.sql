-- Finance seed for demo customers (migration 20): accounts + transactions.
-- Skips a user if they have no auth row or already have at least one account.
-- Login/password unchanged: customer1@ultrafinance.local … customer3 / DemoSeed2026!

DO $$
DECLARE
  v_cat_food   uuid;
  v_cat_trans  uuid;
  v_cat_shop   uuid;
  v_cat_salary uuid;
  v_cat_free   uuid;
  v_user       uuid;
  v_acc_thb    uuid;
  v_acc_mmk    uuid;
  v_txn        uuid;
  v_amt        numeric;
  v_base       numeric;
  v_rate_mmk   CONSTANT numeric := 0.0105263158;
  cust         int;
  i            int;
  d            date;
BEGIN
  SELECT id INTO v_cat_food FROM public.categories WHERE name = 'Food & Drink' AND is_system LIMIT 1;
  SELECT id INTO v_cat_trans FROM public.categories WHERE name = 'Transport' AND is_system LIMIT 1;
  SELECT id INTO v_cat_shop FROM public.categories WHERE name = 'Shopping' AND is_system LIMIT 1;
  SELECT id INTO v_cat_salary FROM public.categories WHERE name = 'Salary' AND is_system LIMIT 1;
  SELECT id INTO v_cat_free FROM public.categories WHERE name = 'Freelance' AND is_system LIMIT 1;

  IF v_cat_food IS NULL OR v_cat_trans IS NULL OR v_cat_shop IS NULL OR v_cat_salary IS NULL OR v_cat_free IS NULL THEN
    RAISE EXCEPTION 'Customer seed requires system categories (20260103000004_categories.sql)';
  END IF;

  FOR cust IN 1..3 LOOP
    v_user := (
      CASE cust
        WHEN 1 THEN 'a0000000-0000-0000-0000-000000000002'::uuid
        WHEN 2 THEN 'a0000000-0000-0000-0000-000000000003'::uuid
        ELSE 'a0000000-0000-0000-0000-000000000004'::uuid
      END
    );
    v_acc_thb := (
      CASE cust
        WHEN 1 THEN 'b9000001-0000-4000-a000-000000000002'::uuid
        WHEN 2 THEN 'b9000001-0000-4000-a000-000000000003'::uuid
        ELSE 'b9000001-0000-4000-a000-000000000004'::uuid
      END
    );
    v_acc_mmk := (
      CASE cust
        WHEN 1 THEN 'b9000002-0000-4000-a000-000000000002'::uuid
        WHEN 2 THEN 'b9000002-0000-4000-a000-000000000003'::uuid
        ELSE 'b9000002-0000-4000-a000-000000000004'::uuid
      END
    );

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user) THEN
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM public.accounts WHERE user_id = v_user) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.accounts (
      id, user_id, name, type, default_currency, icon, color, sort_order
    ) VALUES
      (v_acc_thb, v_user, 'Main THB', 'bank', 'THB', 'landmark', '#6C5CE7', 0),
      (v_acc_mmk, v_user, 'MMK Wallet', 'e_wallet', 'MMK', 'wallet', '#00D68F', 1);

    -- THB expenses (count varies slightly per customer for distinct dashboards)
    FOR i IN 1..(14 + cust) LOOP
      d := (CURRENT_DATE - ((i * 3 + cust * 5) % 75))::date;
      v_amt := (35 + (i * 17) % 420 + (cust * 23))::numeric(19,4);
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (
        v_user,
        'expense',
        (ARRAY[v_cat_food, v_cat_trans, v_cat_shop])[1 + (i % 3)],
        'Customer ' || cust || ' · THB expense #' || i,
        d
      )
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES (
        v_txn, v_acc_thb, -v_amt, 'THB', 1.000000, -v_amt
      );
    END LOOP;

    -- MMK expenses
    FOR i IN 1..(11 + cust) LOOP
      d := (CURRENT_DATE - ((i * 5 + cust * 7) % 70))::date;
      v_amt := (4000 + (i * 631) % 78000 + (cust * 9000))::numeric(19,4);
      v_base := round(v_amt * v_rate_mmk, 4);
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (
        v_user,
        'expense',
        (ARRAY[v_cat_food, v_cat_trans, v_cat_shop])[1 + ((i + cust) % 3)],
        'Customer ' || cust || ' · MMK expense #' || i,
        d
      )
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES (
        v_txn, v_acc_mmk, -v_amt, 'MMK', v_rate_mmk, -v_base
      );
    END LOOP;

    -- THB income
    FOR i IN 1..(6 + cust) LOOP
      d := (CURRENT_DATE - ((i * 4 + cust) % 50))::date;
      v_amt := (12000 + i * 1800 + cust * 500)::numeric(19,4);
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (v_user, 'income', v_cat_salary, 'Customer ' || cust || ' · Salary #' || i, d)
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES (
        v_txn, v_acc_thb, v_amt, 'THB', 1.000000, v_amt
      );
    END LOOP;

    -- MMK freelance income
    FOR i IN 1..(5 + (cust % 3)) LOOP
      d := (CURRENT_DATE - ((i * 6 + cust * 2) % 48))::date;
      v_amt := (65000 + i * 12000 + cust * 8000)::numeric(19,4);
      v_base := round(v_amt * v_rate_mmk, 4);
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (v_user, 'income', v_cat_free, 'Customer ' || cust || ' · Freelance MMK #' || i, d)
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES (
        v_txn, v_acc_mmk, v_amt, 'MMK', v_rate_mmk, v_base
      );
    END LOOP;

    -- THB → MMK transfers
    FOR i IN 1..(4 + cust) LOOP
      d := (CURRENT_DATE - ((i * 7 + cust) % 38))::date;
      v_amt := (2500 + i * 400 + cust * 200)::numeric(19,4);
      v_base := v_amt;
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (v_user, 'transfer', NULL, 'Customer ' || cust || ' · THB→MMK #' || i, d)
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES
        (v_txn, v_acc_thb, -v_amt, 'THB', 1.000000, -v_base),
        (
          v_txn,
          v_acc_mmk,
          round(v_amt * 95, 4),
          'MMK',
          v_rate_mmk,
          v_base
        );
    END LOOP;

    -- MMK → THB transfers
    FOR i IN 1..(3 + (cust % 2)) LOOP
      d := (CURRENT_DATE - ((i * 9 + cust * 3) % 32))::date;
      v_amt := (150000 + i * 20000 + cust * 15000)::numeric(19,4);
      v_base := round(v_amt * v_rate_mmk, 4);
      INSERT INTO public.transactions (user_id, type, category_id, description, date)
      VALUES (v_user, 'transfer', NULL, 'Customer ' || cust || ' · MMK→THB #' || i, d)
      RETURNING id INTO v_txn;

      INSERT INTO public.transaction_lines (
        transaction_id, account_id, amount, currency_code, exchange_rate, base_amount
      ) VALUES
        (v_txn, v_acc_mmk, -v_amt, 'MMK', v_rate_mmk, -v_base),
        (v_txn, v_acc_thb, v_base, 'THB', 1.000000, v_base);
    END LOOP;
  END LOOP;
END $$;
