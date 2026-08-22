-- Phase 1: helper and aggregation functions
-- SECURITY DEFINER functions use an empty search_path and fully qualified names.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.timezone('utc', pg_catalog.now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.briefing_local_date(
  p_instant timestamptz,
  p_timezone text
)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (
    pg_catalog.timezone(
      COALESCE(
        NULLIF(pg_catalog.btrim(p_timezone), ''),
        'Europe/Amsterdam'
      ),
      p_instant
    )
  )::date;
$$;

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
      ORDER BY t.executed_at ASC, t.created_at ASC, t.id ASC
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
    ORDER BY t.executed_at ASC, t.created_at ASC, t.id ASC
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

CREATE OR REPLACE FUNCTION public.sync_transaction_holding_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_holding_aggregate(OLD.holding_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_holding_aggregate(NEW.holding_id);

  IF TG_OP = 'UPDATE' AND NEW.holding_id IS DISTINCT FROM OLD.holding_id THEN
    PERFORM public.recalculate_holding_aggregate(OLD.holding_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_holding_aggregate_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting('investment_os.allow_aggregate_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.asset_type = 'cash'::public.asset_type THEN
      IF NEW.quantity <> 0 OR NEW.average_cost <> 1 THEN
        RAISE EXCEPTION
          'cash holdings must start with quantity 0 and average_cost 1; use transactions to change balances';
      END IF;
    ELSE
      IF NEW.quantity <> 0 OR NEW.average_cost <> 0 THEN
        RAISE EXCEPTION
          'investment holdings must start with quantity 0 and average_cost 0; use transactions to change balances';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.average_cost IS DISTINCT FROM OLD.average_cost THEN
    RAISE EXCEPTION
      'holding quantity and average_cost are ledger-derived and cannot be updated directly';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_portfolio_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_portfolio public.portfolios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_portfolio
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'portfolio % not found', NEW.portfolio_id;
  END IF;

  IF v_portfolio.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'portfolio ownership mismatch for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_holding_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_holding public.holdings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_holding
  FROM public.holdings
  WHERE id = NEW.holding_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'holding % not found', NEW.holding_id;
  END IF;

  IF v_holding.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'holding ownership mismatch for user %', NEW.user_id;
  END IF;

  IF v_holding.portfolio_id <> NEW.portfolio_id THEN
    RAISE EXCEPTION 'holding portfolio mismatch for portfolio %', NEW.portfolio_id;
  END IF;

  IF v_holding.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'holding % is deleted', NEW.holding_id;
  END IF;

  IF v_holding.currency <> NEW.currency THEN
    RAISE EXCEPTION 'transaction currency % must match holding currency %',
      NEW.currency, v_holding.currency;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_holding_portfolio_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_portfolio public.portfolios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_portfolio
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'portfolio % not found', NEW.portfolio_id;
  END IF;

  IF v_portfolio.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'holding portfolio ownership mismatch for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_import_row_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_job public.import_jobs%ROWTYPE;
BEGIN
  SELECT *
  INTO v_job
  FROM public.import_jobs
  WHERE id = NEW.import_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'import job % not found', NEW.import_job_id;
  END IF;

  IF v_job.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'import row user mismatch for job %', NEW.import_job_id;
  END IF;

  IF v_job.portfolio_id <> NEW.portfolio_id THEN
    RAISE EXCEPTION 'import row portfolio mismatch for job %', NEW.import_job_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_briefing_snapshot_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_portfolio public.portfolios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_portfolio
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'portfolio % not found', NEW.portfolio_id;
  END IF;

  IF v_portfolio.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'briefing snapshot portfolio ownership mismatch for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_transaction_import_commit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status public.import_row_status;
BEGIN
  IF NEW.import_row_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ir.status
  INTO v_status
  FROM public.import_rows ir
  WHERE ir.id = NEW.import_row_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'import row % not found', NEW.import_row_id;
  END IF;

  IF v_status <> 'committed'::public.import_row_status THEN
    RAISE EXCEPTION
      'transactions linked to import rows require import_row status committed, got %',
      v_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.portfolios (user_id, name, is_primary)
  SELECT NEW.id, 'Main portfolio', true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.portfolios p
    WHERE p.user_id = NEW.id
      AND p.is_primary = true
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_existing_auth_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted_profiles integer := 0;
  v_inserted_settings integer := 0;
  v_inserted_portfolios integer := 0;
BEGIN
  WITH inserted AS (
    INSERT INTO public.profiles (id, email, full_name)
    SELECT
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data ->> 'full_name', u.email)
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = u.id
    )
    RETURNING 1
  )
  SELECT pg_catalog.count(*) INTO v_inserted_profiles FROM inserted;

  WITH inserted AS (
    INSERT INTO public.user_settings (user_id)
    SELECT u.id
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_settings s
      WHERE s.user_id = u.id
    )
    RETURNING 1
  )
  SELECT pg_catalog.count(*) INTO v_inserted_settings FROM inserted;

  WITH inserted AS (
    INSERT INTO public.portfolios (user_id, name, is_primary)
    SELECT u.id, 'Main portfolio', true
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.user_id = u.id
        AND p.is_primary = true
    )
    RETURNING 1
  )
  SELECT pg_catalog.count(*) INTO v_inserted_portfolios FROM inserted;

  RETURN v_inserted_profiles + v_inserted_settings + v_inserted_portfolios;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_holding_aggregate(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_transaction_holding_aggregate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_existing_auth_users() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.briefing_local_date(timestamptz, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

COMMIT;
