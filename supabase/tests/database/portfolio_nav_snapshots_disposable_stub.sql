-- Disposable local stubs for executing portfolio_nav_snapshots in isolation.
-- Not a production migration. Do not apply to remote Supabase.
--
-- auth.uid() is a faithful stand-in for the Supabase JWT helper:
--   real Supabase: JWT `sub` via request.jwt.claim.sub / request.jwt.claims
--   this harness: GUC app.user_id
-- RLS predicates that compare user_id = auth.uid() behave the same once uid is set.

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

CREATE OR REPLACE FUNCTION public.validate_portfolio_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_portfolio public.portfolios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_portfolio
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'portfolio % not found', NEW.portfolio_id;
  END IF;

  IF v_portfolio.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'portfolio ownership mismatch for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

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
GRANT ALL ON public.portfolios TO service_role;
