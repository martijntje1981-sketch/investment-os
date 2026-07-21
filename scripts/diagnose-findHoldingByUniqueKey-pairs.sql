-- Mirrors findHoldingByUniqueKey(): natural key match WITHOUT deleted_at filter.
-- Groups with exactly 2 rows where one is active and one is tombstone confirm PGRST116 root cause.

WITH primary_portfolios AS (
  SELECT p.id AS portfolio_id, p.user_id
  FROM public.portfolios p
  WHERE p.is_primary = true
),
natural_key_groups AS (
  SELECT
    h.user_id,
    h.portfolio_id,
    h.asset_type,
    h.symbol,
    h.currency,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE h.deleted_at IS NULL) AS active_rows,
    COUNT(*) FILTER (WHERE h.deleted_at IS NOT NULL) AS tombstone_rows
  FROM public.holdings h
  INNER JOIN primary_portfolios pp
    ON pp.portfolio_id = h.portfolio_id
   AND pp.user_id = h.user_id
  GROUP BY
    h.user_id,
    h.portfolio_id,
    h.asset_type,
    h.symbol,
    h.currency
  HAVING COUNT(*) > 1
)
SELECT
  h.id,
  h.deleted_at,
  h.user_id,
  h.portfolio_id,
  h.asset_type,
  h.symbol,
  h.currency,
  g.total_rows,
  g.active_rows,
  g.tombstone_rows
FROM public.holdings h
INNER JOIN natural_key_groups g
  ON g.user_id = h.user_id
 AND g.portfolio_id = h.portfolio_id
 AND g.asset_type = h.asset_type
 AND g.symbol = h.symbol
 AND g.currency = h.currency
ORDER BY
  h.user_id,
  h.portfolio_id,
  h.asset_type,
  h.symbol,
  h.currency,
  h.deleted_at NULLS FIRST,
  h.created_at,
  h.id;
