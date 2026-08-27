-- Per-portfolio sync compare-and-swap, ledger audit (no hard-delete), and
-- atomic commit_portfolio_sync. Non-destructive: additive columns, index
-- rebuild, function replace. Does not rewrite holding quantities or live ledgers.

BEGIN;

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS sync_version bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.portfolios.sync_version IS
  'Monotonic per-portfolio write version. Clients must send the version they hydrated.';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

COMMENT ON COLUMN public.transactions.superseded_at IS
  'Set when a later client_sync/client_migration ledger replaces this row. Null means the row still counts toward aggregates.';

DROP INDEX IF EXISTS public.transactions_user_idempotency_idx;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_idx
  ON public.transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND superseded_at IS NULL;

ALTER TABLE public.portfolio_sync_events
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_version bigint,
  ADD COLUMN IF NOT EXISTS resulting_version bigint,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS holding_count integer,
  ADD COLUMN IF NOT EXISTS content_fingerprint text,
  ADD COLUMN IF NOT EXISTS error_code text;

CREATE INDEX IF NOT EXISTS portfolio_sync_events_portfolio_created_idx
  ON public.portfolio_sync_events (portfolio_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recalculate_holding_aggregate(p_holding_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_holding public.holdings%ROWTYPE;
  v_txn record;
  v_quantity numeric(20, 8) := 0;
  v_average_cost numeric(20, 8) := 0;
  v_total_cost numeric(20, 8) := 0;
BEGIN
  SELECT *
  INTO v_holding
  FROM public.holdings
  WHERE id = p_holding_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_holding.asset_type = 'cash'::public.asset_type THEN
    FOR v_txn IN
      SELECT t.type, t.quantity
      FROM public.transactions t
      WHERE t.holding_id = p_holding_id
        AND t.superseded_at IS NULL
      ORDER BY t.executed_at ASC, t.ledger_sequence ASC
    LOOP
      CASE v_txn.type
        WHEN 'deposit'::public.transaction_type THEN
          v_quantity := v_quantity + v_txn.quantity;
        WHEN 'withdrawal'::public.transaction_type THEN
          v_quantity := v_quantity - v_txn.quantity;
        WHEN 'adjustment'::public.transaction_type THEN
          v_quantity := v_quantity + v_txn.quantity;
        WHEN 'fee'::public.transaction_type THEN
          v_quantity := v_quantity - v_txn.quantity;
        ELSE
          NULL;
      END CASE;
    END LOOP;

    IF v_quantity < 0 THEN
      RAISE EXCEPTION 'cash holding % would become negative (%.', p_holding_id, v_quantity;
    END IF;

    PERFORM pg_catalog.set_config('investment_os.allow_aggregate_update', 'on', true);

    UPDATE public.holdings
    SET
      quantity = v_quantity,
      average_cost = 1,
      updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    WHERE id = p_holding_id;

    RETURN;
  END IF;

  v_quantity := 0;
  v_average_cost := 0;
  v_total_cost := 0;

  FOR v_txn IN
    SELECT t.type, t.quantity, t.unit_price, t.fees, t.metadata
    FROM public.transactions t
    WHERE t.holding_id = p_holding_id
      AND t.superseded_at IS NULL
    ORDER BY t.executed_at ASC, t.ledger_sequence ASC
  LOOP
    CASE v_txn.type
      WHEN 'buy'::public.transaction_type THEN
        v_total_cost := v_total_cost + (v_txn.quantity * v_txn.unit_price) + v_txn.fees;
        v_quantity := v_quantity + v_txn.quantity;
        IF v_quantity > 0 THEN
          v_average_cost := v_total_cost / v_quantity;
        ELSE
          v_average_cost := 0;
          v_total_cost := 0;
        END IF;

      WHEN 'sell'::public.transaction_type THEN
        IF v_txn.quantity > v_quantity THEN
          RAISE EXCEPTION 'sell quantity % exceeds holding quantity % for holding %.',
            v_txn.quantity, v_quantity, p_holding_id;
        END IF;

        v_quantity := v_quantity - v_txn.quantity;
        v_total_cost := v_average_cost * v_quantity;

      WHEN 'adjustment'::public.transaction_type THEN
        IF COALESCE((v_txn.metadata ->> 'set_average_cost')::boolean, false) THEN
          v_average_cost := v_txn.unit_price;
          v_total_cost := v_average_cost * v_quantity;
        ELSIF v_txn.quantity > 0 AND v_txn.unit_price > 0 THEN
          v_total_cost := v_total_cost + (v_txn.quantity * v_txn.unit_price) + v_txn.fees;
          v_quantity := v_quantity + v_txn.quantity;
          IF v_quantity > 0 THEN
            v_average_cost := v_total_cost / v_quantity;
          END IF;
        ELSIF v_txn.quantity > 0 THEN
          v_quantity := v_quantity + v_txn.quantity;
        END IF;

      WHEN 'fee'::public.transaction_type THEN
        IF v_quantity > 0 THEN
          v_total_cost := v_total_cost + v_txn.fees;
          v_average_cost := v_total_cost / v_quantity;
        END IF;

      WHEN 'split'::public.transaction_type THEN
        IF COALESCE((v_txn.metadata ->> 'split_ratio')::numeric, 0) > 0 THEN
          v_quantity := v_quantity * (v_txn.metadata ->> 'split_ratio')::numeric;
          v_total_cost := v_average_cost * v_quantity;
        END IF;

      ELSE
        NULL;
    END CASE;
  END LOOP;

  IF v_quantity < 0 THEN
    RAISE EXCEPTION 'investment holding % would become negative (%.', p_holding_id, v_quantity;
  END IF;

  PERFORM pg_catalog.set_config('investment_os.allow_aggregate_update', 'on', true);

  UPDATE public.holdings
  SET
    quantity = v_quantity,
    average_cost = CASE WHEN v_quantity > 0 THEN v_average_cost ELSE 0 END,
    updated_at = pg_catalog.timezone('utc', pg_catalog.now())
  WHERE id = p_holding_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_portfolio_sync(p_plan jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_portfolio public.portfolios%ROWTYPE;
  v_portfolio_id uuid;
  v_base_version bigint;
  v_kind text;
  v_holding jsonb;
  v_mapping jsonb;
  v_ledger jsonb;
  v_import jsonb;
  v_goal jsonb;
  v_id uuid;
  v_now timestamptz := pg_catalog.timezone('utc', pg_catalog.now());
  v_soft_delete uuid;
  v_existing_goal_id uuid;
  v_asset_type text;
  v_avg numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  v_portfolio_id := (p_plan ->> 'portfolio_id')::uuid;
  v_base_version := COALESCE((p_plan ->> 'base_version')::bigint, -1);
  v_kind := COALESCE(p_plan ->> 'kind', 'sync');

  IF v_portfolio_id IS NULL THEN
    RAISE EXCEPTION 'portfolio_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_portfolio
  FROM public.portfolios
  WHERE id = v_portfolio_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.user_id <> v_uid THEN
    RAISE EXCEPTION 'portfolio not found' USING ERRCODE = 'PT404';
  END IF;

  IF v_portfolio.sync_version IS DISTINCT FROM v_base_version THEN
    RAISE EXCEPTION 'stale_version' USING ERRCODE = 'PT409';
  END IF;

  FOR v_holding IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_plan -> 'holdings', '[]'::jsonb))
  LOOP
    v_id := (v_holding ->> 'id')::uuid;
    v_asset_type := v_holding ->> 'asset_type';
    v_avg := CASE WHEN v_asset_type = 'cash' THEN 1 ELSE 0 END;

    IF EXISTS (
      SELECT 1 FROM public.holdings h WHERE h.id = v_id AND h.user_id = v_uid
    ) THEN
      UPDATE public.holdings
      SET
        name = COALESCE(v_holding ->> 'name', name),
        symbol = COALESCE(v_holding ->> 'symbol', symbol),
        currency = COALESCE(v_holding ->> 'currency', currency),
        sort_order = COALESCE((v_holding ->> 'sort_order')::integer, sort_order),
        deleted_at = NULL,
        metadata = CASE
          WHEN v_holding ? 'metadata' THEN v_holding -> 'metadata'
          ELSE metadata
        END,
        last_market_price = CASE
          WHEN v_holding ? 'last_market_price' THEN (v_holding ->> 'last_market_price')::numeric
          ELSE last_market_price
        END,
        last_market_price_at = CASE
          WHEN v_holding ? 'last_market_price_at' THEN (v_holding ->> 'last_market_price_at')::timestamptz
          ELSE last_market_price_at
        END,
        previous_close = CASE
          WHEN v_holding ? 'previous_close' THEN (v_holding ->> 'previous_close')::numeric
          ELSE previous_close
        END,
        updated_at = v_now
      WHERE id = v_id
        AND user_id = v_uid
        AND portfolio_id = v_portfolio_id;
    ELSE
      INSERT INTO public.holdings (
        id,
        portfolio_id,
        user_id,
        asset_type,
        symbol,
        name,
        quantity,
        average_cost,
        currency,
        sort_order,
        deleted_at,
        metadata
      ) VALUES (
        v_id,
        v_portfolio_id,
        v_uid,
        v_asset_type::public.asset_type,
        v_holding ->> 'symbol',
        COALESCE(v_holding ->> 'name', v_holding ->> 'symbol'),
        0,
        v_avg,
        COALESCE(v_holding ->> 'currency', 'EUR'),
        COALESCE((v_holding ->> 'sort_order')::integer, 0),
        NULL,
        COALESCE(v_holding -> 'metadata', '{}'::jsonb)
      );
    END IF;
  END LOOP;

  FOR v_mapping IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_plan -> 'mappings', '[]'::jsonb))
  LOOP
    BEGIN
      INSERT INTO public.holding_instrument_mappings (
        holding_id,
        user_id,
        portfolio_id,
        isin,
        exchange,
        provider,
        provider_symbol,
        instrument_name,
        quote_currency,
        match_method,
        match_confidence,
        match_warnings,
        confirmed_at
      ) VALUES (
        (v_mapping ->> 'holding_id')::uuid,
        v_uid,
        v_portfolio_id,
        NULLIF(v_mapping ->> 'isin', ''),
        v_mapping ->> 'exchange',
        COALESCE(v_mapping ->> 'provider', 'eodhd'),
        v_mapping ->> 'provider_symbol',
        v_mapping ->> 'instrument_name',
        NULLIF(v_mapping ->> 'quote_currency', ''),
        COALESCE(v_mapping ->> 'match_method', 'manual'),
        COALESCE((v_mapping ->> 'match_confidence')::numeric, 1),
        COALESCE(v_mapping -> 'match_warnings', '[]'::jsonb),
        COALESCE((v_mapping ->> 'confirmed_at')::timestamptz, v_now)
      )
      ON CONFLICT (holding_id) DO UPDATE SET
        isin = EXCLUDED.isin,
        exchange = EXCLUDED.exchange,
        provider_symbol = EXCLUDED.provider_symbol,
        instrument_name = EXCLUDED.instrument_name,
        quote_currency = EXCLUDED.quote_currency,
        match_method = EXCLUDED.match_method,
        match_confidence = EXCLUDED.match_confidence,
        match_warnings = EXCLUDED.match_warnings,
        confirmed_at = EXCLUDED.confirmed_at,
        updated_at = v_now;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  FOR v_ledger IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_plan -> 'ledgers', '[]'::jsonb))
  LOOP
    IF COALESCE((v_ledger ->> 'supersede_existing')::boolean, false) THEN
      UPDATE public.transactions
      SET superseded_at = v_now
      WHERE user_id = v_uid
        AND holding_id = (v_ledger ->> 'holding_id')::uuid
        AND source IN ('client_sync', 'client_migration')
        AND superseded_at IS NULL;
    END IF;

    IF COALESCE((v_ledger ->> 'quantity')::numeric, 0) > 0 THEN
      BEGIN
        INSERT INTO public.transactions (
          portfolio_id,
          user_id,
          holding_id,
          type,
          quantity,
          unit_price,
          currency,
          executed_at,
          source,
          idempotency_key,
          metadata
        ) VALUES (
          v_portfolio_id,
          v_uid,
          (v_ledger ->> 'holding_id')::uuid,
          (v_ledger ->> 'type')::public.transaction_type,
          (v_ledger ->> 'quantity')::numeric,
          COALESCE((v_ledger ->> 'unit_price')::numeric, 0),
          COALESCE(v_ledger ->> 'currency', 'EUR'),
          COALESCE((v_ledger ->> 'executed_at')::date, (v_now)::date),
          COALESCE(v_ledger ->> 'source', 'client_sync'),
          v_ledger ->> 'idempotency_key',
          COALESCE(v_ledger -> 'metadata', '{}'::jsonb)
        );
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END IF;
  END LOOP;

  IF v_kind = 'sync' THEN
    FOR v_soft_delete IN
      SELECT (value #>> '{}')::uuid
      FROM jsonb_array_elements(COALESCE(p_plan -> 'soft_delete_ids', '[]'::jsonb))
    LOOP
      UPDATE public.holdings
      SET deleted_at = v_now, updated_at = v_now
      WHERE id = v_soft_delete
        AND user_id = v_uid
        AND portfolio_id = v_portfolio_id
        AND deleted_at IS NULL;
    END LOOP;
  END IF;

  IF COALESCE((p_plan ->> 'update_goal')::boolean, false) THEN
    v_goal := p_plan -> 'goal';
    SELECT g.id
    INTO v_existing_goal_id
    FROM public.financial_goals g
    WHERE g.user_id = v_uid
      AND g.portfolio_id = v_portfolio_id
      AND g.is_active = true
    LIMIT 1;

    IF v_goal IS NULL OR v_goal = 'null'::jsonb THEN
      IF v_existing_goal_id IS NOT NULL THEN
        UPDATE public.financial_goals
        SET is_active = false, updated_at = v_now
        WHERE id = v_existing_goal_id
          AND user_id = v_uid;
      END IF;
    ELSIF v_existing_goal_id IS NOT NULL THEN
      UPDATE public.financial_goals
      SET
        target_value = (v_goal ->> 'target_value')::numeric,
        target_year = (v_goal ->> 'target_year')::integer,
        monthly_contribution = COALESCE((v_goal ->> 'monthly_contribution')::numeric, 0),
        expected_annual_return = COALESCE((v_goal ->> 'expected_annual_return')::numeric, 0),
        passive_income_target = (v_goal ->> 'passive_income_target')::numeric,
        is_active = true,
        updated_at = v_now
      WHERE id = v_existing_goal_id
        AND user_id = v_uid;
    ELSE
      INSERT INTO public.financial_goals (
        user_id,
        portfolio_id,
        target_value,
        target_year,
        monthly_contribution,
        expected_annual_return,
        passive_income_target,
        is_active
      ) VALUES (
        v_uid,
        v_portfolio_id,
        (v_goal ->> 'target_value')::numeric,
        (v_goal ->> 'target_year')::integer,
        COALESCE((v_goal ->> 'monthly_contribution')::numeric, 0),
        COALESCE((v_goal ->> 'expected_annual_return')::numeric, 0),
        (v_goal ->> 'passive_income_target')::numeric,
        true
      );
    END IF;
  END IF;

  FOR v_import IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_plan -> 'import_mappings', '[]'::jsonb))
  LOOP
    INSERT INTO public.saved_import_mappings (
      id,
      user_id,
      lookup_key,
      isin,
      symbol,
      exchange,
      instrument_name,
      provider_symbol,
      quote_currency,
      match_method,
      confirmed_at
    ) VALUES (
      COALESCE((v_import ->> 'id')::uuid, gen_random_uuid()),
      v_uid,
      v_import ->> 'lookup_key',
      NULLIF(v_import ->> 'isin', ''),
      v_import ->> 'symbol',
      v_import ->> 'exchange',
      v_import ->> 'instrument_name',
      v_import ->> 'provider_symbol',
      NULLIF(v_import ->> 'quote_currency', ''),
      COALESCE(v_import ->> 'match_method', 'ticker_exchange'),
      COALESCE((v_import ->> 'confirmed_at')::timestamptz, v_now)
    )
    ON CONFLICT (user_id, lookup_key) DO UPDATE SET
      isin = EXCLUDED.isin,
      symbol = EXCLUDED.symbol,
      exchange = EXCLUDED.exchange,
      instrument_name = EXCLUDED.instrument_name,
      provider_symbol = EXCLUDED.provider_symbol,
      quote_currency = EXCLUDED.quote_currency,
      match_method = EXCLUDED.match_method,
      confirmed_at = EXCLUDED.confirmed_at,
      updated_at = v_now;
  END LOOP;

  UPDATE public.portfolios
  SET
    sync_version = sync_version + 1,
    updated_at = v_now
  WHERE id = v_portfolio_id
    AND user_id = v_uid
  RETURNING * INTO v_portfolio;

  INSERT INTO public.portfolio_sync_events (
    user_id,
    portfolio_id,
    kind,
    idempotency_key,
    status,
    payload_hash,
    completed_at,
    base_version,
    resulting_version,
    client_id,
    holding_count,
    content_fingerprint
  ) VALUES (
    v_uid,
    v_portfolio_id,
    v_kind,
    COALESCE(p_plan ->> 'idempotency_key', ''),
    'completed',
    p_plan ->> 'payload_hash',
    v_now,
    v_base_version,
    v_portfolio.sync_version,
    NULLIF(p_plan ->> 'client_id', ''),
    COALESCE((p_plan ->> 'holding_count')::integer, jsonb_array_length(COALESCE(p_plan -> 'holdings', '[]'::jsonb))),
    NULLIF(p_plan ->> 'content_fingerprint', '')
  )
  ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
    status = 'completed',
    payload_hash = EXCLUDED.payload_hash,
    completed_at = EXCLUDED.completed_at,
    portfolio_id = EXCLUDED.portfolio_id,
    base_version = EXCLUDED.base_version,
    resulting_version = EXCLUDED.resulting_version,
    client_id = EXCLUDED.client_id,
    holding_count = EXCLUDED.holding_count,
    content_fingerprint = EXCLUDED.content_fingerprint,
    error_code = NULL;

  RETURN jsonb_build_object(
    'portfolio_id', v_portfolio_id,
    'resulting_version', v_portfolio.sync_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_portfolio_sync(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_portfolio_sync(jsonb) TO authenticated;

COMMIT;
