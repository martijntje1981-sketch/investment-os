-- Phase 2 portfolio sync RLS and isolation checks on staging.
-- Uses pg_temp helpers to simulate authenticated JWT context.

CREATE OR REPLACE FUNCTION pg_temp.set_authenticated_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.reset_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
END;
$$;

DO $$
DECLARE
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid;
  v_user_b uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid;
  v_portfolio_a uuid;
  v_portfolio_b uuid;
  v_holding_a uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid;
  v_count integer;
BEGIN
  SELECT id INTO v_portfolio_a
  FROM public.portfolios
  WHERE user_id = v_user_a AND is_primary = true
  LIMIT 1;

  SELECT id INTO v_portfolio_b
  FROM public.portfolios
  WHERE user_id = v_user_b AND is_primary = true
  LIMIT 1;

  IF v_portfolio_a IS NULL OR v_portfolio_b IS NULL THEN
    RAISE EXCEPTION 'Expected primary portfolios for test users';
  END IF;

  PERFORM pg_temp.set_authenticated_user(v_user_a);

  INSERT INTO public.saved_import_mappings (
    user_id, lookup_key, symbol, provider_symbol, match_method, confirmed_at
  )
  VALUES (
    v_user_a,
    'isin:IE00BK5BQT80',
    'VWCE',
    'VWCE.XETRA',
    'isin',
    timezone('utc', now())
  )
  ON CONFLICT (user_id, lookup_key) DO NOTHING;

  INSERT INTO public.holdings (
    id, portfolio_id, user_id, asset_type, symbol, name, quantity, average_cost, currency
  )
  VALUES (
    v_holding_a, v_portfolio_a, v_user_a, 'investment', 'VWCE', 'Vanguard FTSE All-World', 0, 0, 'EUR'
  )
  ON CONFLICT (id) DO UPDATE SET deleted_at = NULL;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_a,
    v_user_a,
    v_holding_a,
    'buy',
    12,
    98.5,
    'EUR',
    CURRENT_DATE,
    'client_migration',
    'staging-sql-test:vwce'
  )
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_count
  FROM public.holdings
  WHERE user_id = v_user_a AND deleted_at IS NULL;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'User A could not persist holdings under RLS';
  END IF;

  PERFORM pg_temp.set_authenticated_user(v_user_b);

  SELECT COUNT(*) INTO v_count
  FROM public.holdings
  WHERE user_id = v_user_a;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'User B could read user A holdings (RLS failure)';
  END IF;

  BEGIN
    INSERT INTO public.holdings (
      id, portfolio_id, user_id, asset_type, symbol, name, quantity, average_cost, currency
    )
    VALUES (
      gen_random_uuid(), v_portfolio_b, v_user_a, 'investment', 'SPOOF', 'Spoof', 0, 0, 'EUR'
    );
    RAISE EXCEPTION 'User B inserted holding with spoofed user_id (RLS failure)';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%row-level security%'
         AND SQLERRM NOT LIKE '%ownership mismatch%'
         AND SQLERRM NOT LIKE '%violates%' THEN
        RAISE;
      END IF;
  END;

  PERFORM pg_temp.reset_role();
END $$;

SELECT 'phase2_staging_rls_ok' AS result;
