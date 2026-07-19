-- Phase 1: reset aggregate-update guard flag after ledger recalculation
-- The allow_aggregate_update flag is transaction-local. Without resetting it,
-- any later UPDATE in the same transaction bypasses guard_holding_aggregate_columns.

BEGIN;

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

    PERFORM pg_catalog.set_config('investment_os.allow_aggregate_update', 'off', true);

    RETURN;
  END IF;

  v_quantity := 0;
  v_average_cost := 0;
  v_total_cost := 0;

  FOR v_txn IN
    SELECT t.type, t.quantity, t.unit_price, t.fees, t.metadata
    FROM public.transactions t
    WHERE t.holding_id = p_holding_id
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

  PERFORM pg_catalog.set_config('investment_os.allow_aggregate_update', 'off', true);
END;
$$;

COMMIT;
