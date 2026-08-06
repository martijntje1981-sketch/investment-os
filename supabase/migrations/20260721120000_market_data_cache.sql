-- Shared market-data caches (cross-instance, provider-neutral keys)

BEGIN;

CREATE TABLE IF NOT EXISTS public.market_quote_cache (
  cache_key text PRIMARY KEY,
  provider_id text NOT NULL,
  provider_symbol text NOT NULL,
  quote_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'fresh',
  last_error text,
  fetched_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL,
  stale_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT market_quote_cache_status_valid CHECK (
    status IN ('fresh', 'stale', 'unavailable')
  )
);

CREATE INDEX IF NOT EXISTS market_quote_cache_provider_symbol_idx
  ON public.market_quote_cache (provider_id, provider_symbol);

CREATE INDEX IF NOT EXISTS market_quote_cache_expires_at_idx
  ON public.market_quote_cache (expires_at);

CREATE TABLE IF NOT EXISTS public.instrument_lookup_cache (
  lookup_key text PRIMARY KEY,
  provider_id text NOT NULL DEFAULT 'eodhd',
  lookup_type text NOT NULL,
  result_json jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT instrument_lookup_cache_type_valid CHECK (
    lookup_type IN ('id_mapping', 'search')
  )
);

CREATE INDEX IF NOT EXISTS instrument_lookup_cache_expires_at_idx
  ON public.instrument_lookup_cache (expires_at);

ALTER TABLE public.market_quote_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_lookup_cache ENABLE ROW LEVEL SECURITY;

-- Server-side API routes use service_role; no public client access required.

COMMIT;
