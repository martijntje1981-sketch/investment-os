-- Portfolio-level contributions ledger (deposits and withdrawals).
-- Separate from per-holding transactions; stores frozen FX at entry time.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'portfolio_contribution_entry_type'
  ) THEN
    CREATE TYPE public.portfolio_contribution_entry_type AS ENUM (
      'contribution',
      'withdrawal'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'portfolio_contribution_source'
  ) THEN
    CREATE TYPE public.portfolio_contribution_source AS ENUM (
      'manual',
      'opening_balance',
      'import'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.portfolio_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entry_type public.portfolio_contribution_entry_type NOT NULL,
  amount numeric(20, 8) NOT NULL,
  currency char(3) NOT NULL,
  base_currency char(3) NOT NULL,
  base_amount numeric(20, 8) NOT NULL,
  fx_rate_used numeric(20, 8) NOT NULL DEFAULT 1,
  entry_date date NOT NULL,
  note text,
  source public.portfolio_contribution_source NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT portfolio_contributions_amount_positive CHECK (amount > 0),
  CONSTRAINT portfolio_contributions_base_amount_positive CHECK (base_amount > 0),
  CONSTRAINT portfolio_contributions_fx_rate_positive CHECK (fx_rate_used > 0),
  CONSTRAINT portfolio_contributions_currency_uppercase CHECK (currency = upper(currency)),
  CONSTRAINT portfolio_contributions_base_currency_uppercase CHECK (
    base_currency = upper(base_currency)
  ),
  CONSTRAINT portfolio_contributions_currency_allowlist CHECK (
    currency IN ('EUR', 'USD', 'GBP')
  ),
  CONSTRAINT portfolio_contributions_base_currency_allowlist CHECK (
    base_currency IN ('EUR', 'USD', 'GBP')
  ),
  CONSTRAINT portfolio_contributions_note_length CHECK (
    note IS NULL OR length(trim(note)) <= 500
  )
);

CREATE INDEX IF NOT EXISTS portfolio_contributions_portfolio_entry_date_idx
  ON public.portfolio_contributions (portfolio_id, entry_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS portfolio_contributions_user_id_idx
  ON public.portfolio_contributions (user_id);

ALTER TABLE public.portfolio_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_contributions_select_own ON public.portfolio_contributions;
CREATE POLICY portfolio_contributions_select_own
  ON public.portfolio_contributions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_contributions_insert_own ON public.portfolio_contributions;
CREATE POLICY portfolio_contributions_insert_own
  ON public.portfolio_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_contributions_update_own ON public.portfolio_contributions;
CREATE POLICY portfolio_contributions_update_own
  ON public.portfolio_contributions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolio_contributions_delete_own ON public.portfolio_contributions;
CREATE POLICY portfolio_contributions_delete_own
  ON public.portfolio_contributions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_portfolio_contributions_updated_at ON public.portfolio_contributions;
CREATE TRIGGER set_portfolio_contributions_updated_at
  BEFORE UPDATE ON public.portfolio_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS portfolio_contributions_validate_portfolio ON public.portfolio_contributions;
CREATE TRIGGER portfolio_contributions_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.portfolio_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_portfolio_ownership();

COMMIT;
