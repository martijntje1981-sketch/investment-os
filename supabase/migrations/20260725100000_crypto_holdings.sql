-- Phase 2A: crypto holdings in existing portfolio sync architecture.
-- Additive only: extends asset_type enum and adds metadata JSON for crypto fields.

BEGIN;

ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'crypto';

ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.holdings.metadata IS
  'Asset-type-specific fields. Crypto uses pairCurrency, tradingPair, pricingStatus, platform, and manual valuation metadata.';

REVOKE UPDATE ON public.holdings FROM authenticated;

GRANT UPDATE (
  symbol,
  name,
  currency,
  sort_order,
  deleted_at,
  last_market_price,
  last_market_price_at,
  previous_close,
  metadata
) ON public.holdings TO authenticated;

COMMIT;
