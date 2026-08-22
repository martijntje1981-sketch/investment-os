-- Linked contribution destination detail (cash vs one holding).
-- Metadata only — does not mutate holdings or create buy transactions.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'portfolio_contribution_destination_type'
  ) THEN
    CREATE TYPE public.portfolio_contribution_destination_type AS ENUM (
      'cash',
      'holding'
    );
  END IF;
END $$;

ALTER TABLE public.portfolio_contributions
  ADD COLUMN IF NOT EXISTS destination_type
    public.portfolio_contribution_destination_type NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS destination_holding_id uuid
    REFERENCES public.holdings (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_holding_symbol text,
  ADD COLUMN IF NOT EXISTS destination_quantity numeric(20, 8),
  ADD COLUMN IF NOT EXISTS destination_price_per_unit numeric(20, 8),
  ADD COLUMN IF NOT EXISTS destination_fee numeric(20, 8);

ALTER TABLE public.portfolio_contributions
  DROP CONSTRAINT IF EXISTS portfolio_contributions_destination_shape;

ALTER TABLE public.portfolio_contributions
  ADD CONSTRAINT portfolio_contributions_destination_shape CHECK (
    (
      destination_type = 'cash'
      AND destination_holding_id IS NULL
      AND destination_holding_symbol IS NULL
      AND destination_quantity IS NULL
      AND destination_price_per_unit IS NULL
      AND destination_fee IS NULL
    )
    OR (
      destination_type = 'holding'
      AND destination_holding_id IS NOT NULL
      AND destination_holding_symbol IS NOT NULL
      AND length(trim(destination_holding_symbol)) > 0
      AND destination_quantity IS NOT NULL
      AND destination_quantity > 0
      AND destination_price_per_unit IS NOT NULL
      AND destination_price_per_unit > 0
      AND (destination_fee IS NULL OR destination_fee >= 0)
    )
  );

ALTER TABLE public.portfolio_contributions
  DROP CONSTRAINT IF EXISTS portfolio_contributions_withdrawal_cash_only;

ALTER TABLE public.portfolio_contributions
  ADD CONSTRAINT portfolio_contributions_withdrawal_cash_only CHECK (
    entry_type <> 'withdrawal' OR destination_type = 'cash'
  );

CREATE INDEX IF NOT EXISTS portfolio_contributions_destination_holding_id_idx
  ON public.portfolio_contributions (destination_holding_id)
  WHERE destination_holding_id IS NOT NULL;

COMMIT;
