-- Phase 9C: idempotent weekly/monthly personal-review email send ledger.
-- Bodies are not stored. Cron writes via service role; users can read their own rows.

BEGIN;

CREATE TABLE IF NOT EXISTS public.period_review_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  report_kind text NOT NULL,
  period_key text NOT NULL,
  sent_at timestamptz,
  provider_message_id text,
  status text NOT NULL DEFAULT 'sent',
  skip_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT period_review_email_sends_kind_valid
    CHECK (report_kind IN ('weekly', 'monthly')),
  CONSTRAINT period_review_email_sends_status_valid
    CHECK (status IN ('sent', 'skipped', 'failed')),
  CONSTRAINT period_review_email_sends_period_key_not_blank
    CHECK (length(trim(period_key)) > 0)
);

ALTER TABLE public.period_review_email_sends
  DROP CONSTRAINT IF EXISTS period_review_email_sends_identity_key;
ALTER TABLE public.period_review_email_sends
  ADD CONSTRAINT period_review_email_sends_identity_key
  UNIQUE (user_id, report_kind, period_key);

CREATE INDEX IF NOT EXISTS period_review_email_sends_user_sent_idx
  ON public.period_review_email_sends (user_id, sent_at DESC);

ALTER TABLE public.period_review_email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS period_review_email_sends_select_own
  ON public.period_review_email_sends;
CREATE POLICY period_review_email_sends_select_own
  ON public.period_review_email_sends
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.period_review_email_sends FROM PUBLIC;
GRANT SELECT ON public.period_review_email_sends TO authenticated;

COMMIT;
