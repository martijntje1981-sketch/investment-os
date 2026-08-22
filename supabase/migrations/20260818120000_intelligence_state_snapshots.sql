-- Phase 8A: compact intelligence-state snapshots for Change Intelligence.
-- Immutable after insert (first write for a period wins). No email/PDF fields.

BEGIN;

CREATE TABLE IF NOT EXISTS public.intelligence_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  snapshot_kind text NOT NULL,
  -- weekly: YYYY-Www (ISO week); monthly: YYYY-MM
  period_key text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  schema_version integer NOT NULL DEFAULT 1,
  captured_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT intelligence_state_snapshots_kind_valid
    CHECK (snapshot_kind IN ('weekly', 'monthly')),
  CONSTRAINT intelligence_state_snapshots_period_key_valid
    CHECK (
      (
        snapshot_kind = 'weekly'
        AND period_key ~ '^\d{4}-W[0-5][0-9]$'
      )
      OR (
        snapshot_kind = 'monthly'
        AND period_key ~ '^\d{4}-(0[1-9]|1[0-2])$'
      )
    ),
  CONSTRAINT intelligence_state_snapshots_timezone_not_blank
    CHECK (length(trim(timezone)) > 0),
  CONSTRAINT intelligence_state_snapshots_schema_version_positive
    CHECK (schema_version >= 1)
);

ALTER TABLE public.intelligence_state_snapshots
  DROP CONSTRAINT IF EXISTS intelligence_state_snapshots_period_identity_key;
ALTER TABLE public.intelligence_state_snapshots
  ADD CONSTRAINT intelligence_state_snapshots_period_identity_key
  UNIQUE (user_id, portfolio_id, snapshot_kind, period_key);

CREATE INDEX IF NOT EXISTS intelligence_state_snapshots_user_captured_idx
  ON public.intelligence_state_snapshots (user_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS intelligence_state_snapshots_user_kind_period_idx
  ON public.intelligence_state_snapshots (user_id, snapshot_kind, period_key DESC);

ALTER TABLE public.intelligence_state_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intelligence_state_snapshots_select_own
  ON public.intelligence_state_snapshots;
CREATE POLICY intelligence_state_snapshots_select_own
  ON public.intelligence_state_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS intelligence_state_snapshots_insert_own
  ON public.intelligence_state_snapshots;
CREATE POLICY intelligence_state_snapshots_insert_own
  ON public.intelligence_state_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON public.intelligence_state_snapshots TO authenticated;

COMMIT;
