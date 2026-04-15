-- Extra demo logins (regular customers, role user). Same password for all.
-- Password: DemoSeed2026!
--
-- | Email                          | Display name        |
-- |--------------------------------|---------------------|
-- | customer1@ultrafinance.local   | Demo Customer One   |
-- | customer2@ultrafinance.local   | Demo Customer Two   |
-- | customer3@ultrafinance.local   | Demo Customer Three |

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  i int;
  v_id uuid;
  v_email text;
  v_name text;
  v_ids uuid[] := ARRAY[
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000004'::uuid
  ];
  v_emails text[] := ARRAY[
    'customer1@ultrafinance.local',
    'customer2@ultrafinance.local',
    'customer3@ultrafinance.local'
  ];
  v_names text[] := ARRAY[
    'Demo Customer One',
    'Demo Customer Two',
    'Demo Customer Three'
  ];
BEGIN
  FOR i IN 1..3 LOOP
    v_id := v_ids[i];
    v_email := v_emails[i];
    v_name := v_names[i];

    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
      CONTINUE;
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
      v_id,
      'authenticated',
      'authenticated',
      v_email,
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
      v_id,
      v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );

    UPDATE public.profiles
    SET display_name = v_name
    WHERE id = v_id;
  END LOOP;
END;
$$;
