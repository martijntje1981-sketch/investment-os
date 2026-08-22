-- Read-only verification for crypto holdings migration (20260725100000).
-- Safe to run on linked production/staging after migration apply.

-- 1) asset_type includes crypto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'asset_type'
      AND e.enumlabel = 'crypto'
  ) THEN
    RAISE EXCEPTION 'asset_type enum missing crypto value';
  END IF;
END $$;

-- 2) metadata column shape
DO $$
DECLARE
  v_attnum smallint;
  v_notnull boolean;
  v_default text;
BEGIN
  SELECT a.attnum, a.attnotnull, pg_get_expr(ad.adbin, ad.adrelid)
  INTO v_attnum, v_notnull, v_default
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relname = 'holdings'
    AND a.attname = 'metadata'
    AND NOT a.attisdropped;

  IF v_attnum IS NULL THEN
    RAISE EXCEPTION 'holdings.metadata column missing';
  END IF;

  IF NOT v_notnull THEN
    RAISE EXCEPTION 'holdings.metadata is not NOT NULL';
  END IF;

  IF v_default IS DISTINCT FROM '''{}''::jsonb' THEN
    RAISE EXCEPTION 'holdings.metadata default is not {}::jsonb (got %)', v_default;
  END IF;
END $$;

-- 3) Existing investment/cash row counts (informational)
SELECT asset_type, COUNT(*) AS active_count
FROM public.holdings
WHERE deleted_at IS NULL
GROUP BY asset_type
ORDER BY asset_type;

-- 4) RLS enabled + policies scoped to auth.uid()
DO $$
DECLARE
  v_rls boolean;
  v_policy_count integer;
BEGIN
  SELECT relrowsecurity
  INTO v_rls
  FROM pg_class
  WHERE oid = 'public.holdings'::regclass;

  IF NOT COALESCE(v_rls, false) THEN
    RAISE EXCEPTION 'RLS not enabled on public.holdings';
  END IF;

  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'holdings'
    AND (
      qual ILIKE '%auth.uid()%'
      OR with_check ILIKE '%auth.uid()%'
    );

  IF v_policy_count < 1 THEN
    RAISE EXCEPTION 'No holdings RLS policies referencing auth.uid()';
  END IF;
END $$;

-- 5) Authenticated UPDATE privilege includes metadata
DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.holdings', 'metadata', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated role lacks UPDATE on holdings.metadata';
  END IF;
END $$;

-- 6) Investment unique index still excludes crypto (partial WHERE)
DO $$
DECLARE
  v_pred text;
BEGIN
  SELECT pg_get_expr(indpred, indrelid)
  INTO v_pred
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
  WHERE c.relname = 'holdings_investment_symbol_currency_idx';

  IF v_pred IS NULL OR v_pred NOT ILIKE '%investment%' THEN
    RAISE EXCEPTION 'holdings_investment_symbol_currency_idx predicate unexpected: %', v_pred;
  END IF;

  IF v_pred ILIKE '%crypto%' THEN
    RAISE EXCEPTION 'investment unique index incorrectly includes crypto';
  END IF;
END $$;

-- 7) No duplicate/destructive holdings indexes introduced by crypto migration
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_dup_count
  FROM (
    SELECT indexdef, COUNT(*) AS c
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'holdings'
    GROUP BY indexdef
    HAVING COUNT(*) > 1
  ) d;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Duplicate holdings index definitions detected';
  END IF;
END $$;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'holdings'
ORDER BY indexname;

SELECT 'crypto_holdings_verification_ok' AS result;
