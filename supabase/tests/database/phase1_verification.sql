-- Phase 1 executable verification
-- Run against a local or staging database after migrations are applied.
-- Requires elevated privileges for auth.users inserts and backfill execution.
-- Note: psql users may run with ON_ERROR_STOP; Supabase CLI db query omits that meta-command.

DO $$
DECLARE
  v_table text;
  v_rls boolean;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles',
    'user_settings',
    'portfolios',
    'holdings',
    'holding_instrument_mappings',
    'transactions',
    'financial_goals',
    'import_jobs',
    'import_rows',
    'briefing_snapshots'
  ]
  LOOP
    SELECT relrowsecurity
    INTO v_rls
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.format('public.%I', v_table)::regclass;

    IF NOT COALESCE(v_rls, false) THEN
      RAISE EXCEPTION 'RLS not enabled on public.%', v_table;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT pg_catalog.count(*)
  INTO v_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN (
      'recalculate_holding_aggregate',
      'sync_transaction_holding_aggregate',
      'handle_new_user',
      'backfill_existing_auth_users'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg = 'search_path=""'
    );

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Found % SECURITY DEFINER function(s) without empty search_path', v_count;
  END IF;
END $$;

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
  v_user_id uuid;
  v_portfolio_id uuid;
BEGIN
  v_user_id := pg_temp.create_test_user('signup');

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'signup provisioning did not create profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_settings
    WHERE user_id = v_user_id
      AND timezone = 'Europe/Amsterdam'
      AND base_currency = 'EUR'
  ) THEN
    RAISE EXCEPTION 'signup provisioning did not create default user_settings';
  END IF;

  SELECT id
  INTO v_portfolio_id
  FROM public.portfolios
  WHERE user_id = v_user_id
    AND is_primary = true;

  IF v_portfolio_id IS NULL THEN
    RAISE EXCEPTION 'signup provisioning did not create primary portfolio';
  END IF;
END $$;

DO $$
DECLARE
  v_first integer;
  v_second integer;
BEGIN
  v_first := public.backfill_existing_auth_users();
  v_second := public.backfill_existing_auth_users();

  IF v_second <> 0 THEN
    RAISE EXCEPTION 'backfill is not idempotent, second run inserted % rows', v_second;
  END IF;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_quantity numeric(20, 8);
  v_average_cost numeric(20, 8);
BEGIN
  v_user_id := pg_temp.create_test_user('ledger-buy');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'VWCE', 'Vanguard FTSE All-World', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES
    (v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', CURRENT_DATE, 'verification', pg_catalog.format('phase1:%s:buy-1', v_user_id)),
    (v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 120, 'EUR', CURRENT_DATE, 'verification', pg_catalog.format('phase1:%s:buy-2', v_user_id));

  SELECT quantity, average_cost
  INTO v_quantity, v_average_cost
  FROM public.holdings
  WHERE id = v_holding_id;

  IF v_quantity <> 20 OR v_average_cost <> 110 THEN
    RAISE EXCEPTION 'weighted average mismatch: qty=%, avg=%', v_quantity, v_average_cost;
  END IF;

  BEGIN
    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
    )
    VALUES (
      v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', CURRENT_DATE, 'verification',
      pg_catalog.format('phase1:%s:buy-1', v_user_id)
    );
    RAISE EXCEPTION 'duplicate idempotency key was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_quantity numeric(20, 8);
  v_average_cost numeric(20, 8);
BEGIN
  v_user_id := pg_temp.create_test_user('ledger-sell');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'AAA', 'Test Holding', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 20, 100, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:opening', v_user_id)
  );

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'sell', 5, 130, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:sell-partial', v_user_id)
  );

  SELECT quantity, average_cost
  INTO v_quantity, v_average_cost
  FROM public.holdings
  WHERE id = v_holding_id;

  IF v_quantity <> 15 OR v_average_cost <> 100 THEN
    RAISE EXCEPTION 'partial sell mismatch: qty=%, avg=%', v_quantity, v_average_cost;
  END IF;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'sell', 15, 130, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:sell-full', v_user_id)
  );

  SELECT quantity, average_cost
  INTO v_quantity, v_average_cost
  FROM public.holdings
  WHERE id = v_holding_id;

  IF v_quantity <> 0 OR v_average_cost <> 0 THEN
    RAISE EXCEPTION 'full sell mismatch: qty=%, avg=%', v_quantity, v_average_cost;
  END IF;
END $$;

DO $$
DECLARE
  v_user_a uuid;
  v_user_b uuid;
  v_portfolio_a uuid;
  v_holding_a uuid;
BEGIN
  v_user_a := pg_temp.create_test_user('user-a');
  v_user_b := pg_temp.create_test_user('user-b');

  SELECT id INTO v_portfolio_a FROM public.portfolios WHERE user_id = v_user_a AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_a, v_user_a, 'investment', 'AAA', 'User A Holding', 'EUR'
  )
  RETURNING id INTO v_holding_a;

  BEGIN
    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
    )
    VALUES (
      v_portfolio_a, v_user_b, v_holding_a, 'buy', 1, 10, 'EUR', CURRENT_DATE, 'verification',
      pg_catalog.format('phase1:%s:cross-user', v_user_b)
    );
    RAISE EXCEPTION 'cross-user transaction was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ownership mismatch%' THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_eur_holding uuid;
  v_usd_holding uuid;
  v_eur_qty numeric(20, 8);
  v_usd_qty numeric(20, 8);
BEGIN
  v_user_id := pg_temp.create_test_user('cash');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency, average_cost
  )
  VALUES (
    v_portfolio_id, v_user_id, 'cash', 'EUR', 'EUR Cash', 'EUR', 1
  )
  RETURNING id INTO v_eur_holding;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency, average_cost
  )
  VALUES (
    v_portfolio_id, v_user_id, 'cash', 'USD', 'USD Cash', 'USD', 1
  )
  RETURNING id INTO v_usd_holding;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_eur_holding, 'deposit', 1000, 1, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:eur-deposit', v_user_id)
  );

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_usd_holding, 'deposit', 500, 1, 'USD', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:usd-deposit', v_user_id)
  );

  SELECT quantity INTO v_eur_qty FROM public.holdings WHERE id = v_eur_holding;
  SELECT quantity INTO v_usd_qty FROM public.holdings WHERE id = v_usd_holding;

  IF v_eur_qty <> 1000 OR v_usd_qty <> 500 THEN
    RAISE EXCEPTION 'cash balances mismatch: eur=%, usd=%', v_eur_qty, v_usd_qty;
  END IF;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_guard_trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.holdings'::regclass
      AND tgname = 'holdings_guard_aggregate_columns'
      AND tgenabled = 'O'
  )
  INTO v_guard_trigger_exists;

  IF NOT v_guard_trigger_exists THEN
    RAISE EXCEPTION 'holdings_guard_aggregate_columns trigger is missing or disabled';
  END IF;

  v_user_id := pg_temp.create_test_user('aggregate-guard');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'AAA', 'Guard Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 5, 50, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:guard-buy', v_user_id)
  );

  PERFORM pg_temp.set_authenticated_user(v_user_id);

  BEGIN
    UPDATE public.holdings
    SET quantity = 999
    WHERE id = v_holding_id;
    RAISE EXCEPTION 'authenticated direct aggregate update was allowed';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ledger-derived%' THEN
        RAISE;
      END IF;
  END;

  PERFORM pg_temp.reset_role();
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_job_id uuid;
  v_row_pending uuid;
  v_row_committed uuid;
BEGIN
  v_user_id := pg_temp.create_test_user('import-guard');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'IMP', 'Import Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.import_jobs (
    user_id, portfolio_id, source_type, status
  )
  VALUES (
    v_user_id, v_portfolio_id, 'csv', 'review'
  )
  RETURNING id INTO v_job_id;

  INSERT INTO public.import_rows (
    import_job_id, user_id, portfolio_id, row_index, status, requires_confirmation
  )
  VALUES (
    v_job_id, v_user_id, v_portfolio_id, 0, 'pending_confirmation', true
  )
  RETURNING id INTO v_row_pending;

  INSERT INTO public.import_rows (
    import_job_id, user_id, portfolio_id, row_index, status, requires_confirmation
  )
  VALUES (
    v_job_id, v_user_id, v_portfolio_id, 1, 'committed', false
  )
  RETURNING id INTO v_row_committed;

  BEGIN
    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source,
      import_job_id, import_row_id, idempotency_key
    )
    VALUES (
      v_portfolio_id, v_user_id, v_holding_id, 'buy', 1, 10, 'EUR', CURRENT_DATE, 'verification',
      v_job_id, v_row_pending, pg_catalog.format('phase1:%s:pending-import', v_user_id)
    );
    RAISE EXCEPTION 'pending import row was allowed to create a transaction';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%status committed%' THEN
        RAISE;
      END IF;
  END;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source,
    import_job_id, import_row_id, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 2, 10, 'EUR', CURRENT_DATE, 'verification',
    v_job_id, v_row_committed, pg_catalog.format('phase1:%s:committed-import', v_user_id)
  );
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_local_date date;
BEGIN
  v_user_id := pg_temp.create_test_user('briefing');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  v_local_date := public.briefing_local_date(pg_catalog.timezone('utc', pg_catalog.now()), 'Europe/Amsterdam');

  INSERT INTO public.briefing_snapshots (
    user_id, portfolio_id, snapshot_date, timezone, base_currency, payload, source_hash
  )
  VALUES (
    v_user_id, v_portfolio_id, v_local_date, 'Europe/Amsterdam', 'EUR',
    pg_catalog.jsonb_build_object('status', 'ok'), 'phase1-test'
  );

  BEGIN
    INSERT INTO public.briefing_snapshots (
      user_id, portfolio_id, snapshot_date, timezone, base_currency, payload, source_hash
    )
    VALUES (
      v_user_id, v_portfolio_id, v_local_date, 'Europe/Amsterdam', 'EUR',
      pg_catalog.jsonb_build_object('status', 'duplicate'), 'phase1-test-dup'
    );
    RAISE EXCEPTION 'duplicate briefing snapshot was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
BEGIN
  v_user_id := pg_temp.create_test_user('ledger-oversell');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'OSELL', 'Oversell Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:oversell-buy', v_user_id)
  );

  BEGIN
    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
    )
    VALUES (
      v_portfolio_id, v_user_id, v_holding_id, 'sell', 11, 100, 'EUR', CURRENT_DATE, 'verification',
      pg_catalog.format('phase1:%s:oversell-sell', v_user_id)
    );
    RAISE EXCEPTION 'oversell was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%exceeds holding quantity%' THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_quantity numeric(20, 8);
  v_average_cost numeric(20, 8);
  v_same_day date := CURRENT_DATE;
BEGIN
  v_user_id := pg_temp.create_test_user('ledger-same-day');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'SAME', 'Same Day Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', v_same_day, 'verification',
    pg_catalog.format('phase1:%s:same-buy-1', v_user_id)
  );

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 120, 'EUR', v_same_day, 'verification',
    pg_catalog.format('phase1:%s:same-buy-2', v_user_id)
  );

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'sell', 5, 130, 'EUR', v_same_day, 'verification',
    pg_catalog.format('phase1:%s:same-sell', v_user_id)
  );

  SELECT quantity, average_cost
  INTO v_quantity, v_average_cost
  FROM public.holdings
  WHERE id = v_holding_id;

  IF v_quantity <> 15 OR v_average_cost <> 110 THEN
    RAISE EXCEPTION 'same-day ordering mismatch: qty=%, avg=%', v_quantity, v_average_cost;
  END IF;
END $$;

DO $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_quantity numeric(20, 8);
  v_average_cost numeric(20, 8);
BEGIN
  v_user_id := pg_temp.create_test_user('ledger-backdated');
  SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

  INSERT INTO public.holdings (
    portfolio_id, user_id, asset_type, symbol, name, currency
  )
  VALUES (
    v_portfolio_id, v_user_id, 'investment', 'BACK', 'Backdated Test', 'EUR'
  )
  RETURNING id INTO v_holding_id;

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', CURRENT_DATE, 'verification',
    pg_catalog.format('phase1:%s:recent-buy', v_user_id)
  );

  INSERT INTO public.transactions (
    portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
  )
  VALUES (
    v_portfolio_id, v_user_id, v_holding_id, 'buy', 5, 80, 'EUR', CURRENT_DATE - 30, 'verification',
    pg_catalog.format('phase1:%s:backdated-buy', v_user_id)
  );

  SELECT quantity, average_cost
  INTO v_quantity, v_average_cost
  FROM public.holdings
  WHERE id = v_holding_id;

  IF v_quantity <> 15 OR v_average_cost <> 93.33333333 THEN
    RAISE EXCEPTION 'backdated recalculation mismatch: qty=%, avg=%', v_quantity, v_average_cost;
  END IF;
END $$;

DO $$
DECLARE
  i integer;
  v_user_id uuid;
  v_portfolio_id uuid;
  v_holding_id uuid;
  v_quantity numeric(20, 8);
BEGIN
  FOR i IN 1..10 LOOP
    v_user_id := pg_temp.create_test_user(pg_catalog.format('ledger-determ-%s', i));
    SELECT id INTO v_portfolio_id FROM public.portfolios WHERE user_id = v_user_id AND is_primary = true;

    INSERT INTO public.holdings (
      portfolio_id, user_id, asset_type, symbol, name, currency
    )
    VALUES (
      v_portfolio_id, v_user_id, 'investment',
      pg_catalog.format('DET%s', i),
      pg_catalog.format('Deterministic %s', i),
      'EUR'
    )
    RETURNING id INTO v_holding_id;

    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
    )
    VALUES (
      v_portfolio_id, v_user_id, v_holding_id, 'buy', 10, 100, 'EUR', CURRENT_DATE, 'verification',
      pg_catalog.format('phase1:%s:det-buy', v_user_id)
    );

    INSERT INTO public.transactions (
      portfolio_id, user_id, holding_id, type, quantity, unit_price, currency, executed_at, source, idempotency_key
    )
    VALUES (
      v_portfolio_id, v_user_id, v_holding_id, 'sell', 5, 130, 'EUR', CURRENT_DATE, 'verification',
      pg_catalog.format('phase1:%s:det-sell', v_user_id)
    );

    SELECT quantity INTO v_quantity FROM public.holdings WHERE id = v_holding_id;

    IF v_quantity <> 5 THEN
      RAISE EXCEPTION 'deterministic buy/sell failed on iteration %: qty=%', i, v_quantity;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 1 executable verification passed.';
END $$;
