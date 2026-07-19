-- Authenticated-role RLS and column-privilege verification.
-- Requires elevated privileges to create auth.users and impersonate authenticated role.

CREATE OR REPLACE FUNCTION pg_temp.create_test_user(p_suffix text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    pg_catalog.format('phase1-%s-%s@example.com', p_suffix, v_user_id),
    extensions.crypt('phase1-test-password', extensions.gen_salt('bf')),
    pg_catalog.timezone('utc', pg_catalog.now()),
    pg_catalog.jsonb_build_object('full_name', 'Phase 1 Test User'),
    pg_catalog.timezone('utc', pg_catalog.now()),
    pg_catalog.timezone('utc', pg_catalog.now())
  );

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.set_authenticated_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_catalog.set_config('role', 'authenticated', true);
  PERFORM pg_catalog.set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.reset_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_catalog.set_config('role', 'none', true);
  PERFORM pg_catalog.set_config('request.jwt.claim.sub', '', true);
  PERFORM pg_catalog.set_config('request.jwt.claim.role', '', true);
  RESET role;
END;
$$;

DO $$
DECLARE
  v_user_a uuid;
  v_user_b uuid;
  v_portfolio_a uuid;
  v_holding_a uuid;
  v_visible integer;
BEGIN
  v_user_a := pg_temp.create_test_user('rls-a');
  v_user_b := pg_temp.create_test_user('rls-b');

  SELECT id INTO v_portfolio_a FROM public.portfolios WHERE user_id = v_user_a AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_a, v_user_a, 'investment', 'RLS', 'RLS Test', 'EUR'
  )
  RETURNING id INTO v_holding_a;

  PERFORM pg_temp.set_authenticated_user(v_user_b);

  SELECT pg_catalog.count(*)
  INTO v_visible
  FROM public.holdings
  WHERE id = v_holding_a;

  PERFORM pg_temp.reset_role();

  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'authenticated user B could see user A holding rows: %', v_visible;
  END IF;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_updated integer;
BEGIN
  v_user_id := pg_temp.create_test_user('rls-own-update');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'OWN', 'Own Update Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 3, 10, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:rls-own-buy', v_user_id)
  );

  PERFORM pg_temp.set_authenticated_user(v_user_id);

  BEGIN
    UPDATE public.holdings
    SET quantity = 999
    WHERE id = v_holding_id;
    RAISE EXCEPTION 'authenticated direct quantity update was allowed';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ledger-derived%' THEN
        RAISE;
      END IF;
  END;

  UPDATE public.holdings
  SET name = 'Updated Name'
  WHERE id = v_holding_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM pg_temp.reset_role();

  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'authenticated could not update allowed holding column';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 1 authenticated RLS verification passed.';
END $$;
