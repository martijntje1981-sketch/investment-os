-- Executable checks against a disposable Postgres after the A1 migration.
-- Synthetic UUIDs only. Not applied to remote Supabase.

TRUNCATE TABLE public.portfolio_nav_snapshots;

INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;

INSERT INTO public.portfolios (id, user_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.portfolio_nav_snapshots') IS NULL THEN
    RAISE EXCEPTION 'portfolio_nav_snapshots table is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'portfolio_nav_snapshots' AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on portfolio_nav_snapshots';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_nav_snapshots'
      AND indexname = 'portfolio_nav_snapshots_user_portfolio_date_uidx'
  ) THEN
    RAISE EXCEPTION 'unique (user_id, portfolio_id, snapshot_date) index is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_nav_snapshots'
      AND indexname = 'portfolio_nav_snapshots_user_date_idx'
  ) THEN
    RAISE EXCEPTION 'user/date lookup index is missing';
  END IF;
  RAISE NOTICE 'ok: table, RLS and indexes exist';
END $$;

DO $$
DECLARE
  v_inserts integer;
  v_updates integer;
  v_deletes integer;
  v_selects integer;
BEGIN
  SELECT count(*) INTO v_inserts FROM pg_policies
    WHERE tablename = 'portfolio_nav_snapshots' AND cmd = 'INSERT';
  SELECT count(*) INTO v_updates FROM pg_policies
    WHERE tablename = 'portfolio_nav_snapshots' AND cmd = 'UPDATE';
  SELECT count(*) INTO v_deletes FROM pg_policies
    WHERE tablename = 'portfolio_nav_snapshots' AND cmd = 'DELETE';
  SELECT count(*) INTO v_selects FROM pg_policies
    WHERE tablename = 'portfolio_nav_snapshots' AND cmd = 'SELECT';
  IF v_inserts <> 0 OR v_updates <> 0 OR v_deletes <> 0 THEN
    RAISE EXCEPTION 'client-write RLS policies must not exist';
  END IF;
  IF v_selects < 1 THEN
    RAISE EXCEPTION 'authenticated SELECT policy is missing';
  END IF;
  RAISE NOTICE 'ok: SELECT-only RLS policies';
END $$;

INSERT INTO public.portfolio_nav_snapshots (
  user_id, portfolio_id, snapshot_date, nav_eur, usability,
  holding_count, valued_holding_count, excluded_holding_count, valued_at,
  goal_id, goal_target_value, goal_target_year, goal_target_date,
  goal_monthly_contribution, goal_expected_annual_return,
  goal_updated_at, goal_plan_captured_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '2026-09-01',
  1000,
  'usable',
  1, 1, 0,
  '2026-09-01T10:00:00Z',
  '33333333-3333-4333-8333-333333333333',
  50000, 2035, '2035-12-31',
  200, 7,
  '2026-08-20T12:00:00Z',
  '2026-09-01T08:00:00Z'
);

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-01',
    1100, 'usable', 1, 1, 0
  );
  RAISE EXCEPTION 'expected unique violation for same-day duplicate';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'ok: same-day duplicate rejected';
END $$;

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    '2026-09-01',
    1000, 'usable', 1, 1, 0
  );
  RAISE EXCEPTION 'expected ownership mismatch';
EXCEPTION
  WHEN others THEN
    IF SQLERRM NOT LIKE '%portfolio ownership mismatch%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: cross-portfolio write rejected by ownership trigger';
END $$;

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-02',
    1000, 'usable', 1, 0, 2
  );
  RAISE EXCEPTION 'expected usable/exclusion check';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: usable cannot have exclusions';
END $$;

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-02',
    1000, 'partial', 1, 1, 0
  );
  RAISE EXCEPTION 'expected partial must have exclusions';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: partial cannot masquerade as full coverage';
END $$;

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-02',
    1000, 'usable', 1, 2, 0
  );
  RAISE EXCEPTION 'expected counts-within-total check';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: valued/excluded cannot exceed total holdings';
END $$;

DO $$
BEGIN
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, nav_currency, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-02',
    1000, 'USD', 'usable', 1, 1, 0
  );
  RAISE EXCEPTION 'expected EUR-only currency check';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: non-EUR currency rejected';
END $$;

INSERT INTO public.portfolio_nav_snapshots (
  user_id, portfolio_id, snapshot_date, nav_eur, usability,
  holding_count, valued_holding_count, excluded_holding_count
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '2026-09-05',
  0, 'usable', 1, 1, 0
);
DO $$
DECLARE
  v_nav numeric;
BEGIN
  SELECT nav_eur INTO STRICT v_nav
  FROM public.portfolio_nav_snapshots
  WHERE snapshot_date = '2026-09-05'
    AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_nav <> 0 THEN
    RAISE EXCEPTION 'zero cash NAV was not stored';
  END IF;
  RAISE NOTICE 'ok: zero cash NAV accepted';
END $$;

UPDATE public.portfolio_nav_snapshots
SET
  nav_eur = 1,
  usability = 'partial',
  holding_count = 2,
  valued_holding_count = 1,
  excluded_holding_count = 1,
  valued_at = '2026-09-01T07:00:00Z',
  goal_target_value = 1,
  goal_id = '44444444-4444-4444-8444-444444444444'
WHERE snapshot_date = '2026-09-01'
  AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $$
DECLARE
  v_row public.portfolio_nav_snapshots%ROWTYPE;
BEGIN
  SELECT * INTO STRICT v_row
  FROM public.portfolio_nav_snapshots
  WHERE snapshot_date = '2026-09-01'
    AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_row.nav_eur <> 1000 OR v_row.usability <> 'usable' THEN
    RAISE EXCEPTION 'worse coverage replaced better evidence';
  END IF;
  IF v_row.goal_target_value <> 50000
     OR v_row.goal_id <> '33333333-3333-4333-8333-333333333333' THEN
    RAISE EXCEPTION 'frozen Goal fields were rewritten';
  END IF;
  IF v_row.nav_currency <> 'EUR' THEN
    RAISE EXCEPTION 'canonical currency changed';
  END IF;
  RAISE NOTICE 'ok: worse coverage rejected and Goal fields frozen';
END $$;

INSERT INTO public.portfolio_nav_snapshots (
  user_id, portfolio_id, snapshot_date, nav_eur, usability,
  holding_count, valued_holding_count, excluded_holding_count, valued_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '2026-09-04',
  1000, 'usable', 1, 1, 0, '2026-09-04T12:00:00Z'
);

UPDATE public.portfolio_nav_snapshots
SET nav_eur = 900, valued_at = '2026-09-04T08:00:00Z'
WHERE snapshot_date = '2026-09-04'
  AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $$
DECLARE
  v_row public.portfolio_nav_snapshots%ROWTYPE;
BEGIN
  SELECT * INTO STRICT v_row
  FROM public.portfolio_nav_snapshots
  WHERE snapshot_date = '2026-09-04'
    AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_row.nav_eur <> 1000
     OR v_row.valued_at IS DISTINCT FROM TIMESTAMPTZ '2026-09-04 12:00:00+00' THEN
    RAISE EXCEPTION 'staler valuation replaced fresher evidence';
  END IF;
  RAISE NOTICE 'ok: staler equal-coverage update rejected';
END $$;

GRANT SELECT ON public.portfolio_nav_snapshots TO authenticated;

DO $$
BEGIN
  EXECUTE 'SET ROLE service_role';
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    '2026-09-01',
    2500, 'usable', 1, 1, 0
  );
  RESET ROLE;
  RAISE NOTICE 'ok: service_role write succeeded after ownership trigger';
END $$;

DO $$
DECLARE
  v_count integer;
  v_other integer;
BEGIN
  PERFORM set_config('app.user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
  EXECUTE 'SET ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.portfolio_nav_snapshots;
  SELECT count(*) INTO v_other
  FROM public.portfolio_nav_snapshots
  WHERE portfolio_id = '22222222-2222-4222-8222-222222222222';
  RESET ROLE;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'authenticated SELECT own rows failed, count=%', v_count;
  END IF;
  IF v_other <> 0 THEN
    RAISE EXCEPTION 'authenticated SELECT of another portfolio was not denied';
  END IF;
  RAISE NOTICE 'ok: authenticated SELECT own rows; cross-portfolio hidden';
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.user_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
  EXECUTE 'SET ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.portfolio_nav_snapshots;
  RESET ROLE;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'authenticated SELECT own rows failed for user B, count=%', v_count;
  END IF;
  RAISE NOTICE 'ok: user B SELECT own row only';
END $$;

DO $$
BEGIN
  PERFORM set_config('app.user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
  EXECUTE 'SET ROLE authenticated';
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-03', 1, 'usable', 1, 1, 0
  );
  RESET ROLE;
  RAISE EXCEPTION 'authenticated INSERT must be denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'ok: authenticated INSERT denied';
  WHEN others THEN
    RESET ROLE;
    IF SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: authenticated INSERT denied';
END $$;

DO $$
BEGIN
  PERFORM set_config('app.user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
  EXECUTE 'SET ROLE authenticated';
  UPDATE public.portfolio_nav_snapshots SET nav_eur = 2;
  RESET ROLE;
  RAISE EXCEPTION 'authenticated UPDATE must be denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'ok: authenticated UPDATE denied';
  WHEN others THEN
    RESET ROLE;
    IF SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: authenticated UPDATE denied';
END $$;

DO $$
BEGIN
  PERFORM set_config('app.user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
  EXECUTE 'SET ROLE authenticated';
  DELETE FROM public.portfolio_nav_snapshots;
  RESET ROLE;
  RAISE EXCEPTION 'authenticated DELETE must be denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'ok: authenticated DELETE denied';
  WHEN others THEN
    RESET ROLE;
    IF SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: authenticated DELETE denied';
END $$;

DO $$
BEGIN
  EXECUTE 'SET ROLE anon';
  PERFORM 1 FROM public.portfolio_nav_snapshots;
  RESET ROLE;
  RAISE EXCEPTION 'anon SELECT must be denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'ok: anon has no table privileges';
  WHEN others THEN
    RESET ROLE;
    IF SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: anon has no table privileges';
END $$;

DO $$
BEGIN
  EXECUTE 'SET ROLE service_role';
  INSERT INTO public.portfolio_nav_snapshots (
    user_id, portfolio_id, snapshot_date, nav_eur, usability,
    holding_count, valued_holding_count, excluded_holding_count
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    '2026-09-06',
    1, 'usable', 1, 1, 0
  );
  RESET ROLE;
  RAISE EXCEPTION 'service_role must still fail ownership mismatch';
EXCEPTION
  WHEN others THEN
    RESET ROLE;
    IF SQLERRM NOT LIKE '%portfolio ownership mismatch%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: service_role cannot skip ownership verification';
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.portfolio_nav_snapshots;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'trusted server writer did not persist expected rows, count=%', v_count;
  END IF;
  RAISE NOTICE 'ok: trusted-server rows persisted';
END $$;

TRUNCATE TABLE public.portfolio_nav_snapshots;

SELECT 'portfolio_nav_snapshots disposable verification passed' AS result;
