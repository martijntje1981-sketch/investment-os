-- Phase 2: cache last known market price on holdings for cross-device sync.
-- Additive only; does not alter ledger-derived quantity or average_cost.

BEGIN;

ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS last_market_price numeric,
  ADD COLUMN IF NOT EXISTS last_market_price_at timestamptz;

COMMENT ON COLUMN public.holdings.last_market_price IS
  'Last known valid EUR market price synced from the client; not ledger-derived.';
COMMENT ON COLUMN public.holdings.last_market_price_at IS
  'Timestamp when last_market_price was last updated by the client.';

REVOKE UPDATE ON public.holdings FROM authenticated;

GRANT UPDATE (
  symbol,
  name,
  currency,
  sort_order,
  deleted_at,
  last_market_price,
  last_market_price_at
) ON public.holdings TO authenticated;

COMMIT;
