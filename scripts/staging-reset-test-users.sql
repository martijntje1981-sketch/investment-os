-- Reset portfolio data for staging integration test users only.

DELETE FROM public.transactions
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);

DELETE FROM public.holding_instrument_mappings
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);

UPDATE public.holdings
SET deleted_at = timezone('utc', now())
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
)
AND deleted_at IS NULL;

DELETE FROM public.saved_import_mappings
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);

DELETE FROM public.portfolio_sync_events
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);

UPDATE public.financial_goals
SET is_active = false
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
)
AND is_active = true;

UPDATE public.user_settings
SET migration_completed_at = NULL
WHERE user_id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);

SELECT 'staging_sync_users_reset' AS result;
