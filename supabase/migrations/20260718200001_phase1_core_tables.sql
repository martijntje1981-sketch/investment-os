-- Phase 1: core tables
-- All exact timestamps use timestamptz (UTC storage).
-- User-facing calendar dates (briefing) are stored as DATE in the user's timezone.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  base_currency char(3) NOT NULL DEFAULT 'EUR',
  locale text NOT NULL DEFAULT 'en-GB',
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  migration_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT user_settings_base_currency_uppercase CHECK (base_currency = upper(base_currency)),
  CONSTRAINT user_settings_timezone_not_blank CHECK (length(trim(timezone)) > 0)
);

CREATE TABLE IF NOT EXISTS public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main portfolio',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_one_primary_per_user_idx
  ON public.portfolios (user_id)
  WHERE is_primary = true;

CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  asset_type public.asset_type NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  quantity numeric(20, 8) NOT NULL DEFAULT 0,
  average_cost numeric(20, 8) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT holdings_currency_uppercase CHECK (currency = upper(currency)),
  CONSTRAINT holdings_symbol_not_blank CHECK (length(trim(symbol)) > 0),
  CONSTRAINT holdings_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT holdings_average_cost_non_negative CHECK (average_cost >= 0),
  CONSTRAINT holdings_cash_symbol_matches_currency CHECK (
    asset_type <> 'cash' OR upper(symbol) = currency
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS holdings_one_cash_per_currency_idx
  ON public.holdings (portfolio_id, currency)
  WHERE asset_type = 'cash' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS holdings_investment_symbol_currency_idx
  ON public.holdings (portfolio_id, symbol, currency)
  WHERE asset_type = 'investment' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.holding_instrument_mappings (
  holding_id uuid PRIMARY KEY REFERENCES public.holdings (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  isin char(12),
  exchange text,
  provider text NOT NULL DEFAULT 'eodhd',
  provider_symbol text,
  instrument_name text,
  match_method text,
  match_confidence numeric(4, 3),
  match_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT holding_instrument_mappings_confidence_range CHECK (
    match_confidence IS NULL
    OR (match_confidence >= 0 AND match_confidence <= 1)
  ),
  CONSTRAINT holding_instrument_mappings_isin_format CHECK (
    isin IS NULL OR isin ~ '^[A-Z0-9]{12}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS holding_instrument_mappings_portfolio_isin_idx
  ON public.holding_instrument_mappings (portfolio_id, isin)
  WHERE isin IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  holding_id uuid NOT NULL REFERENCES public.holdings (id) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL,
  quantity numeric(20, 8) NOT NULL,
  unit_price numeric(20, 8) NOT NULL DEFAULT 0,
  fees numeric(20, 8) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  executed_at date NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  import_job_id uuid,
  import_row_id uuid,
  idempotency_key text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT transactions_currency_uppercase CHECK (currency = upper(currency)),
  CONSTRAINT transactions_quantity_positive CHECK (quantity > 0),
  CONSTRAINT transactions_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT transactions_fees_non_negative CHECK (fees >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_idx
  ON public.transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_holding_executed_idx
  ON public.transactions (holding_id, executed_at, created_at);

CREATE TABLE IF NOT EXISTS public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_value numeric(20, 2) NOT NULL,
  target_year integer NOT NULL,
  monthly_contribution numeric(20, 2) NOT NULL DEFAULT 0,
  expected_annual_return numeric(6, 3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT financial_goals_target_year_valid CHECK (target_year >= 1900 AND target_year <= 9999),
  CONSTRAINT financial_goals_target_value_non_negative CHECK (target_value >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_goals_one_active_per_user_idx
  ON public.financial_goals (user_id)
  WHERE is_active = true;

COMMIT;
