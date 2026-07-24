-- Persist last known previous close on holdings for cross-device 1D performance.

BEGIN;

ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS previous_close numeric;

COMMENT ON COLUMN public.holdings.previous_close IS
  'Last known valid EUR previous close synced from the client; not ledger-derived.';

REVOKE UPDATE ON public.holdings FROM authenticated;

GRANT UPDATE (
  symbol,
  name,
  currency,
  sort_order,
  deleted_at,
  last_market_price,
  last_market_price_at,
  previous_close
) ON public.holdings TO authenticated;

COMMIT;
