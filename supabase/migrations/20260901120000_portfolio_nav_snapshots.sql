-- Phase A1: prospective canonical EUR NAV snapshots for future Goal Pace.
-- First trustworthy capture per UTC day wins the frozen Goal plan.
-- Same-day valuation may improve with equal-or-better coverage only.
-- Writes are trusted-server only. Authenticated clients may SELECT own rows.
-- No historical backfill. No reconstructed EOD series. No presentation currency.

BEGIN;

CREATE TABLE IF NOT EXISTS public.portfolio_nav_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  nav_eur numeric(20, 8) NOT NULL,
  nav_currency text NOT NULL DEFAULT 'EUR',
  usability text NOT NULL,
  holding_count integer NOT NULL,
  valued_holding_count integer NOT NULL,
  excluded_holding_count integer NOT NULL,
  valued_at timestamptz,
  -- No FK: deleting/recreating a Goal must not rewrite historical plan identity.
  goal_id uuid,
  goal_target_value numeric(20, 2),
  goal_target_year integer,
  goal_target_date date,
  goal_monthly_contribution numeric(20, 2),
  goal_expected_annual_return numeric(6, 3),
  goal_updated_at timestamptz,
  goal_plan_captured_at timestamptz,
  CONSTRAINT portfolio_nav_snapshots_nav_non_negative CHECK (nav_eur >= 0),
  CONSTRAINT portfolio_nav_snapshots_currency_eur CHECK (nav_currency = 'EUR'),
  CONSTRAINT portfolio_nav_snapshots_usability_valid
    CHECK (usability IN ('usable', 'partial')),
  CONSTRAINT portfolio_nav_snapshots_counts_non_negative CHECK (
    holding_count >= 0
    AND valued_holding_count >= 0
    AND excluded_holding_count >= 0
  ),
  CONSTRAINT portfolio_nav_snapshots_counts_within_total CHECK (
    valued_holding_count <= holding_count
    AND excluded_holding_count <= holding_count
    AND valued_holding_count + excluded_holding_count <= holding_count
  ),
  CONSTRAINT portfolio_nav_snapshots_usable_has_no_exclusions CHECK (
    usability <> 'usable' OR excluded_holding_count = 0
  ),
  CONSTRAINT portfolio_nav_snapshots_partial_has_exclusions CHECK (
    usability <> 'partial' OR excluded_holding_count > 0
  ),
  CONSTRAINT portfolio_nav_snapshots_goal_year_range CHECK (
    goal_target_year IS NULL
    OR (goal_target_year >= 1900 AND goal_target_year <= 9999)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_nav_snapshots_user_portfolio_date_uidx
  ON public.portfolio_nav_snapshots (user_id, portfolio_id, snapshot_date);

CREATE INDEX IF NOT EXISTS portfolio_nav_snapshots_user_date_idx
  ON public.portfolio_nav_snapshots (user_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION public.protect_portfolio_nav_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  old_rank integer;
  new_rank integer;
  worse boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.portfolio_id := OLD.portfolio_id;
    NEW.snapshot_date := OLD.snapshot_date;
    NEW.captured_at := OLD.captured_at;
    NEW.nav_currency := OLD.nav_currency;
    NEW.goal_id := OLD.goal_id;
    NEW.goal_target_value := OLD.goal_target_value;
    NEW.goal_target_year := OLD.goal_target_year;
    NEW.goal_target_date := OLD.goal_target_date;
    NEW.goal_monthly_contribution := OLD.goal_monthly_contribution;
    NEW.goal_expected_annual_return := OLD.goal_expected_annual_return;
    NEW.goal_updated_at := OLD.goal_updated_at;
    NEW.goal_plan_captured_at := OLD.goal_plan_captured_at;

    old_rank := CASE OLD.usability WHEN 'usable' THEN 2 ELSE 1 END;
    new_rank := CASE NEW.usability WHEN 'usable' THEN 2 ELSE 1 END;
    worse :=
      new_rank < old_rank
      OR (
        new_rank = old_rank
        AND NEW.excluded_holding_count > OLD.excluded_holding_count
      )
      OR (
        new_rank = old_rank
        AND NEW.excluded_holding_count = OLD.excluded_holding_count
        AND NEW.valued_holding_count < OLD.valued_holding_count
      )
      OR (
        new_rank = old_rank
        AND NEW.excluded_holding_count = OLD.excluded_holding_count
        AND NEW.valued_holding_count = OLD.valued_holding_count
        AND OLD.valued_at IS NOT NULL
        AND (NEW.valued_at IS NULL OR NEW.valued_at < OLD.valued_at)
      );

    IF worse THEN
      NEW.nav_eur := OLD.nav_eur;
      NEW.usability := OLD.usability;
      NEW.holding_count := OLD.holding_count;
      NEW.valued_holding_count := OLD.valued_holding_count;
      NEW.excluded_holding_count := OLD.excluded_holding_count;
      NEW.valued_at := OLD.valued_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portfolio_nav_snapshots_protect ON public.portfolio_nav_snapshots;
CREATE TRIGGER portfolio_nav_snapshots_protect
  BEFORE UPDATE ON public.portfolio_nav_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_portfolio_nav_snapshot();

DROP TRIGGER IF EXISTS portfolio_nav_snapshots_validate_portfolio
  ON public.portfolio_nav_snapshots;
CREATE TRIGGER portfolio_nav_snapshots_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.portfolio_nav_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_portfolio_ownership();

ALTER TABLE public.portfolio_nav_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_nav_snapshots_insert_own
  ON public.portfolio_nav_snapshots;
DROP POLICY IF EXISTS portfolio_nav_snapshots_update_own
  ON public.portfolio_nav_snapshots;
DROP POLICY IF EXISTS portfolio_nav_snapshots_delete_own
  ON public.portfolio_nav_snapshots;

DROP POLICY IF EXISTS portfolio_nav_snapshots_select_own
  ON public.portfolio_nav_snapshots;
CREATE POLICY portfolio_nav_snapshots_select_own
  ON public.portfolio_nav_snapshots
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.portfolios AS p
      WHERE p.id = portfolio_nav_snapshots.portfolio_id
        AND p.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.portfolio_nav_snapshots FROM PUBLIC;
REVOKE ALL ON public.portfolio_nav_snapshots FROM anon;
REVOKE ALL ON public.portfolio_nav_snapshots FROM authenticated;
GRANT SELECT ON public.portfolio_nav_snapshots TO authenticated;
GRANT ALL ON public.portfolio_nav_snapshots TO postgres, service_role;

COMMIT;
