-- Step 3: give financial goals portfolio ownership.
--
-- Backfill behavior (deterministic, no duplicates, no reckless guesses):
--   Each existing goal is attached to that user's unique primary portfolio
--   (is_primary = true). If a user has no unique primary, the goal is left
--   unmapped (portfolio_id stays null) rather than guessed.
--
-- Data is never deleted. The previous one-active-goal-per-user unique index
-- is replaced with one active goal per portfolio.

BEGIN;

ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios (id) ON DELETE CASCADE;

UPDATE public.financial_goals AS fg
SET portfolio_id = p.id
FROM public.portfolios AS p
WHERE fg.portfolio_id IS NULL
  AND p.user_id = fg.user_id
  AND p.is_primary = true
  AND (
    SELECT count(*)::int
    FROM public.portfolios AS p2
    WHERE p2.user_id = fg.user_id
      AND p2.is_primary = true
  ) = 1;

DROP INDEX IF EXISTS public.financial_goals_one_active_per_user_idx;

CREATE UNIQUE INDEX IF NOT EXISTS financial_goals_one_active_per_portfolio_idx
  ON public.financial_goals (portfolio_id)
  WHERE is_active = true AND portfolio_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS financial_goals_user_portfolio_idx
  ON public.financial_goals (user_id, portfolio_id);

DROP POLICY IF EXISTS financial_goals_select_own ON public.financial_goals;
CREATE POLICY financial_goals_select_own
  ON public.financial_goals
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      portfolio_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.portfolios AS p
        WHERE p.id = financial_goals.portfolio_id
          AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS financial_goals_insert_own ON public.financial_goals;
CREATE POLICY financial_goals_insert_own
  ON public.financial_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      portfolio_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.portfolios AS p
        WHERE p.id = financial_goals.portfolio_id
          AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS financial_goals_update_own ON public.financial_goals;
CREATE POLICY financial_goals_update_own
  ON public.financial_goals
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      portfolio_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.portfolios AS p
        WHERE p.id = financial_goals.portfolio_id
          AND p.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      portfolio_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.portfolios AS p
        WHERE p.id = financial_goals.portfolio_id
          AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS financial_goals_delete_own ON public.financial_goals;
CREATE POLICY financial_goals_delete_own
  ON public.financial_goals
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      portfolio_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.portfolios AS p
        WHERE p.id = financial_goals.portfolio_id
          AND p.user_id = auth.uid()
      )
    )
  );

COMMIT;
