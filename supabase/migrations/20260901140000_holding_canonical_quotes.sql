-- Phase C1: durable server-only canonical crypto valuation (Option D).
-- Latest authoritative PriceService crypto quote per persisted holding.
-- Does not change listed last_market_price semantics.
-- Does not backfill. Does not wire /api/prices or NAV capture.
-- Presentation currency is not stored.
--
-- Field semantics:
--   canonical_eur_unit_price = EUR per one crypto unit (never pair currency).
--   pair_price = price in pair_currency (never a presentation FX amount).
--   fx_to_eur = the exact quote-currency-to-EUR rate used to derive
--               canonical_eur_unit_price (pair_price * fx_to_eur).
--   Crypto previous_close is unused. Crypto 24h move stays pair-based.

BEGIN;

CREATE TABLE IF NOT EXISTS public.holding_canonical_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id uuid NOT NULL REFERENCES public.holdings (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  canonical_eur_unit_price numeric NOT NULL,
  canonical_priced_at timestamptz NOT NULL,
  pair_price numeric NOT NULL,
  pair_currency text NOT NULL,
  fx_to_eur numeric NOT NULL,
  fx_at timestamptz NOT NULL,
  quote_updated_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL,
  provider_symbol text NOT NULL,
  provider_id text NOT NULL,
  data_status text NOT NULL,
  conversion_path text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT holding_canonical_quotes_eur_positive
    CHECK (canonical_eur_unit_price > 0),
  CONSTRAINT holding_canonical_quotes_pair_positive
    CHECK (pair_price > 0),
  CONSTRAINT holding_canonical_quotes_fx_positive
    CHECK (fx_to_eur > 0),
  CONSTRAINT holding_canonical_quotes_data_status_valid
    CHECK (data_status IN ('live', 'delayed')),
  CONSTRAINT holding_canonical_quotes_pair_currency_valid
    CHECK (
      pair_currency IN (
        'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'USDC', 'USDT'
      )
    ),
  CONSTRAINT holding_canonical_quotes_provider_symbol_present
    CHECK (length(trim(provider_symbol)) > 0),
  CONSTRAINT holding_canonical_quotes_provider_id_present
    CHECK (length(trim(provider_id)) > 0),
  CONSTRAINT holding_canonical_quotes_eur_pair_fx
    CHECK (pair_currency <> 'EUR' OR fx_to_eur = 1)
);

COMMENT ON TABLE public.holding_canonical_quotes IS
  'Latest trusted-server crypto valuation per holding. Canonical EUR is per-unit NAV price. Pair price stays in pair_currency. Not listed last_market_price. Not presentation FX.';

COMMENT ON COLUMN public.holding_canonical_quotes.canonical_eur_unit_price IS
  'EUR per one crypto unit. Derived as pair_price * fx_to_eur. Never a pair-currency amount.';

COMMENT ON COLUMN public.holding_canonical_quotes.canonical_priced_at IS
  'Timestamp of the canonical EUR snapshot (quote time used for NAV).';

COMMENT ON COLUMN public.holding_canonical_quotes.pair_price IS
  'Instrument pair price in pair_currency. Must not store canonical EUR unless pair_currency is EUR.';

COMMENT ON COLUMN public.holding_canonical_quotes.pair_currency IS
  'Quote currency of pair_price (BTC/USD => USD). Never a presentation currency.';

COMMENT ON COLUMN public.holding_canonical_quotes.fx_to_eur IS
  'Exact quote-currency-to-EUR rate used to derive canonical_eur_unit_price.';

COMMENT ON COLUMN public.holding_canonical_quotes.fx_at IS
  'Timestamp of the FX rate actually used.';

COMMENT ON COLUMN public.holding_canonical_quotes.quote_updated_at IS
  'Provider quote updated-at. Monotonic writes compare this first.';

COMMENT ON COLUMN public.holding_canonical_quotes.fetched_at IS
  'Server fetch time for this quote. Tie-breaker after quote_updated_at.';

COMMENT ON COLUMN public.holding_canonical_quotes.provider_symbol IS
  'Persisted EODHD crypto provider symbol, e.g. BTC-USD.CC.';

COMMENT ON COLUMN public.holding_canonical_quotes.provider_id IS
  'Safe provider id, e.g. eodhd-quotes. Not a raw payload.';

COMMENT ON COLUMN public.holding_canonical_quotes.data_status IS
  'Authoritative live or delayed only. Stale, unavailable, estimated and manual are rejected.';

CREATE UNIQUE INDEX IF NOT EXISTS holding_canonical_quotes_holding_uidx
  ON public.holding_canonical_quotes (holding_id);

CREATE INDEX IF NOT EXISTS holding_canonical_quotes_user_idx
  ON public.holding_canonical_quotes (user_id);

CREATE OR REPLACE FUNCTION public.protect_holding_canonical_quote()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_holding public.holdings%ROWTYPE;
  v_older boolean;
BEGIN
  NEW.pair_currency := upper(trim(NEW.pair_currency));
  NEW.provider_symbol := upper(trim(NEW.provider_symbol));
  NEW.provider_id := lower(trim(NEW.provider_id));
  NEW.data_status := lower(trim(NEW.data_status));

  SELECT *
    INTO v_holding
    FROM public.holdings
   WHERE id = NEW.holding_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'holding % not found', NEW.holding_id;
  END IF;

  IF v_holding.asset_type::text IS DISTINCT FROM 'crypto' THEN
    RAISE EXCEPTION 'holding_canonical_quotes is crypto-only';
  END IF;

  IF v_holding.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'holding_canonical_quotes ownership mismatch for user %', NEW.user_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.holding_id := OLD.holding_id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;

    v_older :=
      NEW.quote_updated_at < OLD.quote_updated_at
      OR (
        NEW.quote_updated_at = OLD.quote_updated_at
        AND NEW.fetched_at < OLD.fetched_at
      );

    IF v_older THEN
      NEW.canonical_eur_unit_price := OLD.canonical_eur_unit_price;
      NEW.canonical_priced_at := OLD.canonical_priced_at;
      NEW.pair_price := OLD.pair_price;
      NEW.pair_currency := OLD.pair_currency;
      NEW.fx_to_eur := OLD.fx_to_eur;
      NEW.fx_at := OLD.fx_at;
      NEW.quote_updated_at := OLD.quote_updated_at;
      NEW.fetched_at := OLD.fetched_at;
      NEW.provider_symbol := OLD.provider_symbol;
      NEW.provider_id := OLD.provider_id;
      NEW.data_status := OLD.data_status;
      NEW.conversion_path := OLD.conversion_path;
      NEW.updated_at := OLD.updated_at;
    ELSE
      NEW.updated_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS holding_canonical_quotes_protect
  ON public.holding_canonical_quotes;
CREATE TRIGGER holding_canonical_quotes_protect
  BEFORE INSERT OR UPDATE ON public.holding_canonical_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_holding_canonical_quote();

ALTER TABLE public.holding_canonical_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holding_canonical_quotes_select_own
  ON public.holding_canonical_quotes;
DROP POLICY IF EXISTS holding_canonical_quotes_insert_own
  ON public.holding_canonical_quotes;
DROP POLICY IF EXISTS holding_canonical_quotes_update_own
  ON public.holding_canonical_quotes;
DROP POLICY IF EXISTS holding_canonical_quotes_delete_own
  ON public.holding_canonical_quotes;

REVOKE ALL ON public.holding_canonical_quotes FROM PUBLIC;
REVOKE ALL ON public.holding_canonical_quotes FROM anon;
REVOKE ALL ON public.holding_canonical_quotes FROM authenticated;
GRANT ALL ON public.holding_canonical_quotes TO postgres, service_role;

COMMIT;
