-- Phase 1: idempotent backfill for auth.users that predate signup provisioning

BEGIN;

SELECT public.backfill_existing_auth_users();

COMMIT;
