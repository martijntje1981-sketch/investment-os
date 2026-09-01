-- Executable checks against a disposable Postgres after the C1 migration.
-- Synthetic UUIDs only. Not applied to remote Supabase.

TRUNCATE TABLE public.holding_canonical_quotes;

INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;

INSERT INTO public.portfolios (id, user_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;

INSERT INTO public.holdings (
  id, portfolio_id, user_id, asset_type, symbol, name, metadata, last_market_price
) VALUES
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'crypto',
    'BTC',
    'Bitcoin',
    '{"pairCurrency":"USD","providerSymbol":"BTC-USD.CC"}'::jsonb,
    NULL
  ),
  (
    'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'crypto',
    'SHIB',
    'Shiba',
    '{"pairCurrency":"USD","providerSymbol":"SHIB-USD.CC"}'::jsonb,
    NULL
  ),
  (
    'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'investment',
    'VWCE',
    'VWCE',
    '{}'::jsonb,
    100
  ),
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'crypto',
    'ETH',
    'Ether',
    '{"pairCurrency":"USD","providerSymbol":"ETH-USD.CC"}'::jsonb,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_fk text;
BEGIN
  IF to_regclass('public.holding_canonical_quotes') IS NULL THEN
    RAISE EXCEPTION 'holding_canonical_quotes table is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'holding_canonical_quotes' AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on holding_canonical_quotes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'holding_canonical_quotes'
      AND indexname = 'holding_canonical_quotes_holding_uidx'
  ) THEN
    RAISE EXCEPTION 'unique holding_id index is missing';
  END IF;
  SELECT conname INTO v_fk
  FROM pg_constraint
  WHERE conrelid = 'public.holding_canonical_quotes'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) LIKE '%holdings%CASCADE%';
  IF v_fk IS NULL THEN
    RAISE EXCEPTION 'holding_id FK ON DELETE CASCADE is missing';
  END IF;
  RAISE NOTICE 'ok: table, RLS, unique key, FK cascade exist';
END $$;

DO $$
DECLARE
  v_policies integer;
BEGIN
  SELECT count(*) INTO v_policies
  FROM pg_policies
  WHERE tablename = 'holding_canonical_quotes';
  IF v_policies <> 0 THEN
    RAISE EXCEPTION 'holding_canonical_quotes must have no client RLS policies';
  END IF;
  RAISE NOTICE 'ok: no client RLS policies';
END $$;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.holding_canonical_quotes', 'SELECT')
    OR has_table_privilege('anon', 'public.holding_canonical_quotes', 'INSERT')
    OR has_table_privilege('anon', 'public.holding_canonical_quotes', 'UPDATE')
    OR has_table_privilege('anon', 'public.holding_canonical_quotes', 'DELETE')
  THEN
    RAISE EXCEPTION 'anon must have no privileges on holding_canonical_quotes';
  END IF;
  IF has_table_privilege('authenticated', 'public.holding_canonical_quotes', 'SELECT')
    OR has_table_privilege('authenticated', 'public.holding_canonical_quotes', 'INSERT')
    OR has_table_privilege('authenticated', 'public.holding_canonical_quotes', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.holding_canonical_quotes', 'DELETE')
  THEN
    RAISE EXCEPTION 'authenticated must have no privileges on holding_canonical_quotes';
  END IF;
  RAISE NOTICE 'ok: anon/authenticated have no table privileges';
END $$;

DO $$
BEGIN
  IF to_regclass('public.portfolio_nav_snapshots') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = 'portfolio_nav_snapshots' AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'C1 must not disable RLS on portfolio_nav_snapshots';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'portfolio_nav_snapshots' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
    ) THEN
      RAISE EXCEPTION 'C1 must not add write policies on portfolio_nav_snapshots';
    END IF;
  END IF;
  RAISE NOTICE 'ok: existing NAV snapshot policies unchanged';
END $$;

INSERT INTO public.holding_canonical_quotes (
  holding_id, user_id,
  canonical_eur_unit_price, canonical_priced_at,
  pair_price, pair_currency, fx_to_eur, fx_at,
  quote_updated_at, fetched_at,
  provider_symbol, provider_id, data_status
) VALUES (
  'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  1,
  '2026-09-01T11:00:00Z',
  1.1,
  'USD',
  0.9,
  '2026-09-01T11:00:00Z',
  '2026-09-01T11:00:00Z',
  '2026-09-01T11:00:01Z',
  'BTC-USD.CC',
  'eodhd-quotes',
  'live'
);

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    2, '2026-09-01T12:00:00Z',
    2.2, 'USD', 0.9, '2026-09-01T12:00:00Z',
    '2026-09-01T12:00:00Z', '2026-09-01T12:00:01Z',
    'BTC-USD.CC', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected unique violation for second row per holding';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'ok: one latest row per holding';
END $$;

DO $$
DECLARE
  v_price numeric;
BEGIN
  UPDATE public.holding_canonical_quotes
  SET
    canonical_eur_unit_price = 3,
    pair_price = 3.3,
    quote_updated_at = '2026-09-01T10:00:00Z',
    fetched_at = '2026-09-01T10:00:01Z',
    canonical_priced_at = '2026-09-01T10:00:00Z'
  WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';

  SELECT canonical_eur_unit_price INTO v_price
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';

  IF v_price <> 1 THEN
    RAISE EXCEPTION 'older quote overwrote newer canonical price';
  END IF;
  RAISE NOTICE 'ok: older quote cannot overwrite newer';
END $$;

DO $$
DECLARE
  v_holding uuid;
  v_user uuid;
  v_count integer;
BEGIN
  -- Mismatched identity: SHIB is owned by user A, but the UPDATE claims user B.
  -- Contract: reject (ownership mismatch). Identity freeze is not reached.
  BEGIN
    UPDATE public.holding_canonical_quotes
    SET
      holding_id = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
      user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      quote_updated_at = '2026-09-01T12:00:00Z',
      fetched_at = '2026-09-01T12:00:01Z'
    WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';
    RAISE EXCEPTION 'expected ownership mismatch for identity mutation';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT LIKE '%ownership mismatch%' THEN
        RAISE;
      END IF;
  END;

  SELECT holding_id, user_id INTO v_holding, v_user
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';

  IF v_holding IS NULL OR v_user <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' THEN
    RAISE EXCEPTION 'mismatched identity mutation changed the row';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'mismatched identity mutation created a row on the target holding';
  END IF;

  RAISE NOTICE 'ok: mismatched identity mutation is rejected';
END $$;

DO $$
DECLARE
  v_holding uuid;
  v_user uuid;
  v_moved integer;
BEGIN
  -- Otherwise-valid reassignment: ETH belongs to user B, and user_id is set to B.
  -- Contract: UPDATE is rewritten so holding_id/user_id stay on the original row.
  UPDATE public.holding_canonical_quotes
  SET
    holding_id = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    quote_updated_at = '2026-09-01T12:00:00Z',
    fetched_at = '2026-09-01T12:00:01Z'
  WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';

  SELECT holding_id, user_id INTO v_holding, v_user
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0';

  IF v_holding IS DISTINCT FROM 'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0'
    OR v_user IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  THEN
    RAISE EXCEPTION 'valid-target identity mutation reassigned the quote';
  END IF;

  SELECT count(*) INTO v_moved
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'
    OR user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF v_moved <> 0 THEN
    RAISE EXCEPTION 'canonical quote row moved to another holding or user';
  END IF;

  RAISE NOTICE 'ok: identity cannot be reassigned to another valid holding/user';
END $$;

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1, '2026-09-01T11:00:00Z',
    1, 'EUR', 1, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'VWCE.XETRA', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected crypto-only rejection';
EXCEPTION
  WHEN others THEN
    IF SQLERRM NOT LIKE '%crypto-only%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: listed holding cannot receive a canonical crypto quote';
END $$;

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1, '2026-09-01T11:00:00Z',
    1.1, 'USD', 0.9, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'ETH-USD.CC', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected ownership mismatch';
EXCEPTION
  WHEN others THEN
    IF SQLERRM NOT LIKE '%ownership mismatch%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'ok: service write still requires holding ownership match';
END $$;

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    0, '2026-09-01T11:00:00Z',
    1, 'USD', 0.9, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'SHIB-USD.CC', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected non-positive EUR rejection';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: canonical EUR price must be > 0';
END $$;

INSERT INTO public.holding_canonical_quotes (
  holding_id, user_id,
  canonical_eur_unit_price, canonical_priced_at,
  pair_price, pair_currency, fx_to_eur, fx_at,
  quote_updated_at, fetched_at,
  provider_symbol, provider_id, data_status
) VALUES (
  'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  0.000000000012,
  '2026-09-01T11:00:00Z',
  0.000000000013,
  'USD',
  0.9,
  '2026-09-01T11:00:00Z',
  '2026-09-01T11:00:00Z',
  '2026-09-01T11:00:01Z',
  'SHIB-USD.CC',
  'eodhd-quotes',
  'delayed'
);

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    1, '2026-09-01T11:00:00Z',
    1.1, 'USD', 0.9, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'ETH-USD.CC', 'eodhd-quotes', 'stale'
  );
  RAISE EXCEPTION 'expected invalid status rejection';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: stale status rejected';
END $$;

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    1, '2026-09-01T11:00:00Z',
    1.1, 'USD', 0, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'ETH-USD.CC', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected non-positive FX rejection';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: FX rate must be > 0';
END $$;

DO $$
BEGIN
  INSERT INTO public.holding_canonical_quotes (
    holding_id, user_id,
    canonical_eur_unit_price, canonical_priced_at,
    pair_price, pair_currency, fx_to_eur, fx_at,
    quote_updated_at, fetched_at,
    provider_symbol, provider_id, data_status
  ) VALUES (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    1, '2026-09-01T11:00:00Z',
    1, 'EUR', 1.1, '2026-09-01T11:00:00Z',
    '2026-09-01T11:00:00Z', '2026-09-01T11:00:01Z',
    'ETH-EUR.CC', 'eodhd-quotes', 'live'
  );
  RAISE EXCEPTION 'expected EUR pair FX=1 rejection';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'ok: EUR pair cannot use a non-1 FX rate';
END $$;

DO $$
DECLARE
  v_listed_price numeric;
  v_count integer;
BEGIN
  SELECT last_market_price INTO v_listed_price
  FROM public.holdings
  WHERE id = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';
  IF v_listed_price IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'listed last_market_price was changed by C1';
  END IF;

  DELETE FROM public.holdings
  WHERE id = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1';

  SELECT count(*) INTO v_count
  FROM public.holding_canonical_quotes
  WHERE holding_id = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'canonical quote was not deleted with holding';
  END IF;
  RAISE NOTICE 'ok: listed last_market_price unchanged; delete cascades';
END $$;

DO $$
BEGIN
  RAISE NOTICE 'ok: C1 disposable verification complete';
END $$;
