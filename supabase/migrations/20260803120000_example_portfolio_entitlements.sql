-- Example portfolio entitlements: one period per normalized email.
-- Template is reserved at OTP start; the 7-day clock starts on activation.
-- Writes are service-role only; authenticated users may SELECT their own row.

BEGIN;

CREATE TABLE IF NOT EXISTS public.example_portfolio_entitlements (
  email_normalized text PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  template text NOT NULL CHECK (template IN ('global', 'income')),
  -- Null until first successful activation (OTP verified + seed path runs).
  started_at timestamptz,
  expires_at timestamptz,
  seeded_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT example_portfolio_entitlements_window_chk
    CHECK (
      (started_at IS NULL AND expires_at IS NULL)
      OR (
        started_at IS NOT NULL
        AND expires_at IS NOT NULL
        AND expires_at > started_at
      )
    )
);

-- At most one entitlement row per linked auth user.
CREATE UNIQUE INDEX IF NOT EXISTS example_portfolio_entitlements_user_id_uidx
  ON public.example_portfolio_entitlements (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS example_portfolio_entitlements_expires_at_idx
  ON public.example_portfolio_entitlements (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.example_portfolio_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS example_portfolio_entitlements_select_own
  ON public.example_portfolio_entitlements;
CREATE POLICY example_portfolio_entitlements_select_own
  ON public.example_portfolio_entitlements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated → denied by RLS default.
REVOKE ALL ON public.example_portfolio_entitlements FROM PUBLIC;
GRANT SELECT ON public.example_portfolio_entitlements TO authenticated;
GRANT ALL ON public.example_portfolio_entitlements TO service_role;

COMMIT;
