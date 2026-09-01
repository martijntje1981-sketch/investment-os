-- Disposable local stubs for executing holding_canonical_quotes in isolation.
-- Not a production migration. Do not apply to remote Supabase.
--
-- auth.uid() is a faithful stand-in for the Supabase JWT helper:
--   real Supabase: JWT `sub` via request.jwt.claim.sub / request.jwt.claims
--   this harness: GUC app.user_id
-- This table grants no authenticated SELECT; RLS default-deny is still enabled.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE TABLE IF NOT EXISTS public.portfolios (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id)
);

CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL DEFAULT 'holding',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  last_market_price numeric,
  last_market_price_at timestamptz,
  previous_close numeric
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT SELECT ON public.portfolios TO authenticated, service_role;
GRANT SELECT ON public.holdings TO authenticated, service_role;
GRANT ALL ON public.portfolios TO service_role;
GRANT ALL ON public.holdings TO service_role;
