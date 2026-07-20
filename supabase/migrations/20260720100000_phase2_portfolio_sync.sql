-- Phase 2: portfolio cloud sync support
-- Adds import-mapping persistence, sync idempotency tracking, and goal extras.
-- Non-destructive: only CREATE/ALTER IF NOT EXISTS and new RLS policies.

BEGIN;

ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS passive_income_target numeric(20, 2);

CREATE TABLE IF NOT EXISTS public.saved_import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  lookup_key text NOT NULL,
  isin char(12),
  symbol text NOT NULL,
  exchange text,
  instrument_name text,
  provider_symbol text NOT NULL,
  match_method text NOT NULL DEFAULT 'ticker_exchange',
  confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT saved_import_mappings_isin_format CHECK (
    isin IS NULL OR isin ~ '^[A-Z0-9]{12}$'
  ),
  CONSTRAINT saved_import_mappings_lookup_key_not_blank CHECK (
    length(trim(lookup_key)) > 0
  ),
  CONSTRAINT saved_import_mappings_provider_symbol_not_blank CHECK (
    length(trim(provider_symbol)) > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_import_mappings_user_lookup_idx
  ON public.saved_import_mappings (user_id, lookup_key);

CREATE INDEX IF NOT EXISTS saved_import_mappings_user_confirmed_idx
  ON public.saved_import_mappings (user_id, confirmed_at DESC);

CREATE TABLE IF NOT EXISTS public.portfolio_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  payload_hash text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  CONSTRAINT portfolio_sync_events_kind_valid CHECK (
    kind IN ('migrate', 'sync')
  ),
  CONSTRAINT portfolio_sync_events_status_valid CHECK (
    status IN ('pending', 'completed', 'failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_sync_events_user_idempotency_idx
  ON public.portfolio_sync_events (user_id, idempotency_key);

CREATE INDEX IF NOT EXISTS portfolio_sync_events_user_created_idx
  ON public.portfolio_sync_events (user_id, created_at DESC);

ALTER TABLE public.saved_import_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_import_mappings_select_own ON public.saved_import_mappings;
CREATE POLICY saved_import_mappings_select_own
  ON public.saved_import_mappings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS saved_import_mappings_insert_own ON public.saved_import_mappings;
CREATE POLICY saved_import_mappings_insert_own
  ON public.saved_import_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS saved_import_mappings_update_own ON public.saved_import_mappings;
CREATE POLICY saved_import_mappings_update_own
  ON public.saved_import_mappings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS saved_import_mappings_delete_own ON public.saved_import_mappings;
CREATE POLICY saved_import_mappings_delete_own
  ON public.saved_import_mappings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_sync_events_select_own ON public.portfolio_sync_events;
CREATE POLICY portfolio_sync_events_select_own
  ON public.portfolio_sync_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_sync_events_insert_own ON public.portfolio_sync_events;
CREATE POLICY portfolio_sync_events_insert_own
  ON public.portfolio_sync_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_sync_events_update_own ON public.portfolio_sync_events;
CREATE POLICY portfolio_sync_events_update_own
  ON public.portfolio_sync_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_sync_events_delete_own ON public.portfolio_sync_events;
CREATE POLICY portfolio_sync_events_delete_own
  ON public.portfolio_sync_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_import_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_sync_events TO authenticated;

COMMIT;
