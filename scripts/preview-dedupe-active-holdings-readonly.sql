-- READ-ONLY preview for migration: 20260721130000_dedupe_active_holdings.sql
-- Run in Supabase Dashboard → SQL Editor → project fdxtsfgzsyuqcwgumwsp
-- No writes. Safe on production.

-- =============================================================================
-- QUERY 1: Duplicate active holding groups (detail)
-- =============================================================================
WITH ranked_holdings AS (
  SELECT
    h.id,
    h.portfolio_id,
    h.user_id,
    h.asset_type,
    h.symbol,
    h.currency,
    h.name,
    h.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY
        h.portfolio_id,
        h.asset_type,
        CASE
          WHEN h.asset_type = 'cash' THEN h.currency
          ELSE h.symbol || ':' || h.currency
        END
      ORDER BY h.created_at ASC, h.id ASC
    ) AS rn,
    CASE
      WHEN h.asset_type = 'cash' THEN 'cash:' || h.currency
      ELSE 'investment:' || h.symbol || ':' || h.currency
    END AS natural_key
  FROM public.holdings h
  WHERE h.deleted_at IS NULL
),
migration_duplicate_holdings AS (
  SELECT
    dup.id AS drop_id,
    keep.id AS keep_id,
    dup.user_id,
    dup.portfolio_id,
    dup.asset_type,
    dup.symbol,
    dup.currency,
    dup.natural_key,
    dup.name AS duplicate_name,
    dup.created_at AS duplicate_created_at
  FROM ranked_holdings dup
  JOIN ranked_holdings keep
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
  WHERE dup.rn > 1
),
duplicate_holding_groups AS (
  SELECT
    d.user_id,
    d.portfolio_id,
    d.natural_key,
    d.asset_type,
    d.symbol,
    d.currency,
    MIN(d.keep_id::text)::uuid AS canonical_holding_id_to_keep,
    COUNT(*) AS rows_to_soft_delete,
    array_agg(d.drop_id ORDER BY d.duplicate_created_at ASC, d.drop_id ASC)
      AS duplicate_holding_ids_to_soft_delete
  FROM migration_duplicate_holdings d
  GROUP BY
    d.user_id,
    d.portfolio_id,
    d.natural_key,
    d.asset_type,
    d.symbol,
    d.currency
)
SELECT
  g.user_id,
  g.portfolio_id,
  g.natural_key,
  g.asset_type,
  g.symbol,
  g.currency,
  (
    SELECT array_agg(DISTINCT m.provider_symbol ORDER BY m.provider_symbol)
    FROM public.holding_instrument_mappings m
    WHERE m.holding_id = ANY (
      g.duplicate_holding_ids_to_soft_delete
      || ARRAY[g.canonical_holding_id_to_keep]
    )
      AND m.provider_symbol IS NOT NULL
  ) AS provider_symbols_in_group,
  g.rows_to_soft_delete,
  g.rows_to_soft_delete + 1 AS total_active_rows_in_group,
  g.canonical_holding_id_to_keep,
  g.duplicate_holding_ids_to_soft_delete
FROM duplicate_holding_groups g
ORDER BY g.user_id, g.portfolio_id, g.natural_key;

-- =============================================================================
-- QUERY 2: Row-level detail (canonical vs each duplicate)
-- =============================================================================
-- WITH ranked_holdings AS ( ... same as query 1 ... ),
-- migration_duplicate_holdings AS ( ... same as query 1 ... )
-- SELECT
--   d.user_id,
--   d.portfolio_id,
--   d.natural_key,
--   d.keep_id AS canonical_holding_id_to_keep,
--   d.drop_id AS duplicate_holding_id_to_soft_delete,
--   d.duplicate_name,
--   d.duplicate_created_at,
--   m.provider_symbol
-- FROM migration_duplicate_holdings d
-- LEFT JOIN public.holding_instrument_mappings m
--   ON m.holding_id IN (d.drop_id, d.keep_id)
-- ORDER BY d.user_id, d.natural_key, d.duplicate_created_at;

-- =============================================================================
-- QUERY 3: Duplicate primary portfolio groups
-- =============================================================================
WITH ranked_portfolios AS (
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY p.user_id
      ORDER BY p.created_at ASC, p.id ASC
    ) AS rn
  FROM public.portfolios p
  WHERE p.is_primary = true
)
SELECT
  rp.user_id,
  COUNT(*) AS primary_portfolio_count,
  MIN(rp.id::text) FILTER (WHERE rp.rn = 1)::uuid AS primary_portfolio_id_to_keep,
  array_agg(rp.id ORDER BY rp.created_at ASC, rp.id ASC)
    FILTER (WHERE rp.rn > 1) AS portfolio_ids_to_set_is_primary_false,
  array_agg(rp.name ORDER BY rp.created_at ASC, rp.id ASC)
    FILTER (WHERE rp.rn > 1) AS demoted_portfolio_names
FROM ranked_portfolios rp
GROUP BY rp.user_id
HAVING COUNT(*) > 1
ORDER BY rp.user_id;

-- =============================================================================
-- QUERY 4: Affected row totals (summary)
-- =============================================================================
WITH ranked_holdings AS (
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
),
migration_duplicate_holdings AS (
  SELECT dup.id AS drop_id, keep.id AS keep_id, dup.user_id
  FROM ranked_holdings dup
  JOIN ranked_holdings keep
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
  WHERE dup.rn > 1
),
ranked_portfolios AS (
  SELECT p.id, p.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.user_id ORDER BY p.created_at ASC, p.id ASC
    ) AS rn
  FROM public.portfolios p
  WHERE p.is_primary = true
)
SELECT *
FROM (
  SELECT
    'holdings (soft-delete duplicate actives)' AS target_table,
    (SELECT COUNT(*) FROM migration_duplicate_holdings) AS affected_row_count
  UNION ALL
  SELECT
    'holding_instrument_mappings (repoint)',
    (SELECT COUNT(*)
     FROM public.holding_instrument_mappings m
     JOIN migration_duplicate_holdings d
       ON m.holding_id = d.drop_id AND m.user_id = d.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM public.holding_instrument_mappings e
       WHERE e.holding_id = d.keep_id
     ))
  UNION ALL
  SELECT
    'holding_instrument_mappings (delete duplicate)',
    (SELECT COUNT(*)
     FROM public.holding_instrument_mappings m
     JOIN migration_duplicate_holdings d
       ON m.holding_id = d.drop_id AND m.user_id = d.user_id
     WHERE EXISTS (
       SELECT 1 FROM public.holding_instrument_mappings e
       WHERE e.holding_id = d.keep_id
     ))
  UNION ALL
  SELECT
    'transactions (repoint)',
    (SELECT COUNT(*)
     FROM public.transactions t
     JOIN migration_duplicate_holdings d
       ON t.holding_id = d.drop_id AND t.user_id = d.user_id)
  UNION ALL
  SELECT
    'holdings (recalculate_holding_aggregate calls)',
    (SELECT COUNT(DISTINCT keep_id) FROM migration_duplicate_holdings)
  UNION ALL
  SELECT
    'portfolios (demote duplicate primaries)',
    (SELECT COUNT(*) FROM ranked_portfolios WHERE rn > 1)
) s
ORDER BY target_table;
