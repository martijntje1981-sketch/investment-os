-- Phase 1: import workflow and briefing snapshot tables

BEGIN;

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  source_type public.import_source_type NOT NULL,
  status public.import_job_status NOT NULL DEFAULT 'uploaded',
  temp_file_path text,
  temp_file_expires_at timestamptz,
  row_count integer NOT NULL DEFAULT 0,
  matched_count integer NOT NULL DEFAULT 0,
  pending_confirmation_count integer NOT NULL DEFAULT 0,
  error_message text,
  committed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS import_jobs_user_created_idx
  ON public.import_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS import_jobs_temp_file_expiry_idx
  ON public.import_jobs (temp_file_expires_at)
  WHERE temp_file_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.import_row_status NOT NULL DEFAULT 'parsed',
  requires_confirmation boolean NOT NULL DEFAULT false,
  holding_id uuid REFERENCES public.holdings (id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions (id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT import_rows_row_index_non_negative CHECK (row_index >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS import_rows_job_row_index_idx
  ON public.import_rows (import_job_id, row_index);

CREATE UNIQUE INDEX IF NOT EXISTS import_rows_user_idempotency_idx
  ON public.import_rows (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS import_rows_job_status_idx
  ON public.import_rows (import_job_id, status);

-- Briefing snapshots: one row per user, portfolio, and local calendar date.
CREATE TABLE IF NOT EXISTS public.briefing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  base_currency char(3) NOT NULL DEFAULT 'EUR',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_hash text,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz,
  CONSTRAINT briefing_snapshots_timezone_not_blank CHECK (length(trim(timezone)) > 0),
  CONSTRAINT briefing_snapshots_base_currency_uppercase CHECK (base_currency = upper(base_currency))
);

CREATE UNIQUE INDEX IF NOT EXISTS briefing_snapshots_user_portfolio_date_idx
  ON public.briefing_snapshots (user_id, portfolio_id, snapshot_date);

CREATE INDEX IF NOT EXISTS briefing_snapshots_generated_at_idx
  ON public.briefing_snapshots (generated_at DESC);

-- Deferred foreign keys from transactions/import_rows to import tables.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_import_job_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_import_job_id_fkey
  FOREIGN KEY (import_job_id) REFERENCES public.import_jobs (id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_import_row_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_import_row_id_fkey
  FOREIGN KEY (import_row_id) REFERENCES public.import_rows (id) ON DELETE SET NULL;

COMMIT;
