-- Phase 6B: immutable monthly review snapshots + email delivery metadata.
-- Email opt-in lives in user_settings.preferences.monthly_review_email_opt_in (default absent = OFF).

BEGIN;

CREATE TABLE IF NOT EXISTS public.monthly_review_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  -- Calendar month key: YYYY-MM
  year_month text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_kind text NOT NULL DEFAULT 'calendar_month',
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  base_currency char(3) NOT NULL DEFAULT 'EUR',
  -- CompanionReview-shaped payload (presentation-ready, no full holdings book).
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_hash text,
  status text NOT NULL DEFAULT 'ready',
  version integer NOT NULL DEFAULT 1,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  emailed_at timestamptz,
  email_status text,
  CONSTRAINT monthly_review_snapshots_year_month_format
    CHECK (year_month ~ '^\d{4}-\d{2}$'),
  CONSTRAINT monthly_review_snapshots_period_kind_valid
    CHECK (period_kind IN ('calendar_month', 'month_to_date')),
  CONSTRAINT monthly_review_snapshots_status_valid
    CHECK (status IN ('ready', 'failed', 'skipped')),
  CONSTRAINT monthly_review_snapshots_timezone_not_blank
    CHECK (length(trim(timezone)) > 0),
  CONSTRAINT monthly_review_snapshots_base_currency_uppercase
    CHECK (base_currency = upper(base_currency)),
  CONSTRAINT monthly_review_snapshots_version_positive
    CHECK (version >= 1)
);

-- One snapshot per user/portfolio/month (idempotent generation).
ALTER TABLE public.monthly_review_snapshots
  DROP CONSTRAINT IF EXISTS monthly_review_snapshots_user_portfolio_month_key;
ALTER TABLE public.monthly_review_snapshots
  ADD CONSTRAINT monthly_review_snapshots_user_portfolio_month_key
  UNIQUE (user_id, portfolio_id, year_month);

CREATE INDEX IF NOT EXISTS monthly_review_snapshots_user_generated_idx
  ON public.monthly_review_snapshots (user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS monthly_review_snapshots_email_pending_idx
  ON public.monthly_review_snapshots (status, emailed_at)
  WHERE status = 'ready' AND emailed_at IS NULL;

ALTER TABLE public.monthly_review_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monthly_review_snapshots_select_own ON public.monthly_review_snapshots;
CREATE POLICY monthly_review_snapshots_select_own
  ON public.monthly_review_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS monthly_review_snapshots_insert_own ON public.monthly_review_snapshots;
CREATE POLICY monthly_review_snapshots_insert_own
  ON public.monthly_review_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updates limited to delivery metadata; payload stays immutable via application logic.
DROP POLICY IF EXISTS monthly_review_snapshots_update_own ON public.monthly_review_snapshots;
CREATE POLICY monthly_review_snapshots_update_own
  ON public.monthly_review_snapshots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
