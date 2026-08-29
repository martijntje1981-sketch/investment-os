-- Scheduled market snapshot run ledger (dedupe EU/US open refreshes per Amsterdam day)

BEGIN;

CREATE TABLE IF NOT EXISTS public.market_snapshot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL,
  amsterdam_date date NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  symbols_requested integer NOT NULL DEFAULT 0,
  symbols_received integer NOT NULL DEFAULT 0,
  provider_calls integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT market_snapshot_runs_slot_valid CHECK (
    slot IN ('eu_open', 'us_open')
  ),
  CONSTRAINT market_snapshot_runs_status_valid CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  CONSTRAINT market_snapshot_runs_slot_date_unique UNIQUE (slot, amsterdam_date)
);

CREATE INDEX IF NOT EXISTS market_snapshot_runs_completed_at_idx
  ON public.market_snapshot_runs (completed_at DESC)
  WHERE status = 'completed';

ALTER TABLE public.market_snapshot_runs ENABLE ROW LEVEL SECURITY;

COMMIT;
