-- Phase 2 portfolio sync verification (staging-safe)
-- Verifies RLS, constraints, and non-destructive migration artifacts.

DO $$
DECLARE
  v_table text;
  v_rls boolean;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'saved_import_mappings',
    'portfolio_sync_events'
  ]
  LOOP
    SELECT relrowsecurity
    INTO v_rls
    FROM pg_catalog.pg_class
    WHERE oid = format('public.%I', v_table)::regclass;

    IF NOT COALESCE(v_rls, false) THEN
      RAISE EXCEPTION 'RLS not enabled on public.%', v_table;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.financial_goals'::regclass
      AND attname = 'passive_income_target'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'financial_goals.passive_income_target column missing';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_indexes
    WHERE indexname = 'saved_import_mappings_user_lookup_idx'
  ) THEN
    RAISE EXCEPTION 'saved_import_mappings_user_lookup_idx missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_indexes
    WHERE indexname = 'portfolio_sync_events_user_idempotency_idx'
  ) THEN
    RAISE EXCEPTION 'portfolio_sync_events_user_idempotency_idx missing';
  END IF;
END $$;

SELECT 'phase2_verification_ok' AS result;
