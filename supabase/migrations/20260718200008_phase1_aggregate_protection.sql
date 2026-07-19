-- Phase 1: ledger aggregate protection and import commit safeguards

BEGIN;

DROP TRIGGER IF EXISTS holdings_guard_aggregate_columns ON public.holdings;
CREATE TRIGGER holdings_guard_aggregate_columns
  BEFORE INSERT OR UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_holding_aggregate_columns();

DROP TRIGGER IF EXISTS transactions_validate_import_commit ON public.transactions;
CREATE TRIGGER transactions_validate_import_commit
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_import_commit();

REVOKE UPDATE ON public.holdings FROM authenticated;

GRANT UPDATE (
  symbol,
  name,
  currency,
  sort_order,
  deleted_at
) ON public.holdings TO authenticated;

COMMIT;
