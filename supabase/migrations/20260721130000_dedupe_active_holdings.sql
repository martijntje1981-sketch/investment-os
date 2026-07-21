-- Merge duplicate ACTIVE holdings created by non-idempotent import sync retries.
--
-- Does NOT add or drop constraints. Data-only migration inside a transaction.
-- Uniqueness rule (already enforced by partial unique indexes):
--   investment: (portfolio_id, symbol, currency) WHERE deleted_at IS NULL
--   cash:       (portfolio_id, currency) WHERE deleted_at IS NULL

BEGIN;

-- Shared duplicate pairs: same instrument slot within one portfolio.
CREATE TEMP TABLE migration_duplicate_holdings ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    h.id,
    h.portfolio_id,
    h.user_id,
    h.asset_type,
    h.symbol,
    h.currency,
    ROW_NUMBER() OVER (
      PARTITION BY
        h.portfolio_id,
        h.asset_type,
        CASE
          WHEN h.asset_type = 'cash' THEN h.currency
          ELSE h.symbol || ':' || h.currency
        END
      ORDER BY h.created_at ASC, h.id ASC
    ) AS rn
  FROM public.holdings h
  WHERE h.deleted_at IS NULL
)
SELECT
  dup.id AS drop_id,
  keep.id AS keep_id,
  dup.user_id,
  dup.portfolio_id
FROM ranked dup
JOIN ranked keep
  ON keep.portfolio_id = dup.portfolio_id
 AND keep.user_id = dup.user_id
 AND keep.asset_type = dup.asset_type
 AND (
   (dup.asset_type = 'cash' AND keep.currency = dup.currency)
   OR (
     dup.asset_type = 'investment'
     AND keep.symbol = dup.symbol
     AND keep.currency = dup.currency
   )
 )
 AND keep.rn = 1
WHERE dup.rn > 1;

-- Repoint mappings when the canonical holding has none yet.
UPDATE public.holding_instrument_mappings AS m
SET holding_id = d.keep_id
FROM migration_duplicate_holdings d
WHERE m.holding_id = d.drop_id
  AND m.user_id = d.user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.holding_instrument_mappings existing
    WHERE existing.holding_id = d.keep_id
  );

-- Drop duplicate mappings when canonical already owns the instrument mapping.
DELETE FROM public.holding_instrument_mappings AS m
USING migration_duplicate_holdings d
WHERE m.holding_id = d.drop_id
  AND m.user_id = d.user_id
  AND EXISTS (
    SELECT 1
    FROM public.holding_instrument_mappings existing
    WHERE existing.holding_id = d.keep_id
  );

-- Repoint ledger rows, then refresh aggregates on canonical holdings.
UPDATE public.transactions AS t
SET holding_id = d.keep_id
FROM migration_duplicate_holdings d
WHERE t.holding_id = d.drop_id
  AND t.user_id = d.user_id;

DO $$
DECLARE
  v_keep_id uuid;
BEGIN
  FOR v_keep_id IN
    SELECT DISTINCT keep_id
    FROM migration_duplicate_holdings
  LOOP
    PERFORM public.recalculate_holding_aggregate(v_keep_id);
  END LOOP;
END;
$$;

-- Soft-delete duplicate active holdings (no hard DELETE).
UPDATE public.holdings AS h
SET deleted_at = timezone('utc', now())
FROM migration_duplicate_holdings d
WHERE h.id = d.drop_id
  AND h.user_id = d.user_id
  AND h.deleted_at IS NULL;

-- Demote extra primary portfolios (keep oldest primary per user).
WITH ranked_portfolios AS (
  SELECT
    p.id,
    p.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.user_id
      ORDER BY p.created_at ASC, p.id ASC
    ) AS rn
  FROM public.portfolios p
  WHERE p.is_primary = true
)
UPDATE public.portfolios AS p
SET is_primary = false
FROM ranked_portfolios rp
WHERE p.id = rp.id
  AND rp.rn > 1;

COMMIT;
