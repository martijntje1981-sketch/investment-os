-- Phase 1: triggers and updated_at automation

BEGIN;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER set_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_holdings_updated_at ON public.holdings;
CREATE TRIGGER set_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_holding_instrument_mappings_updated_at ON public.holding_instrument_mappings;
CREATE TRIGGER set_holding_instrument_mappings_updated_at
  BEFORE UPDATE ON public.holding_instrument_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_financial_goals_updated_at ON public.financial_goals;
CREATE TRIGGER set_financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_import_jobs_updated_at ON public.import_jobs;
CREATE TRIGGER set_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_import_rows_updated_at ON public.import_rows;
CREATE TRIGGER set_import_rows_updated_at
  BEFORE UPDATE ON public.import_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS holdings_validate_portfolio ON public.holdings;
CREATE TRIGGER holdings_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_holding_portfolio_consistency();

DROP TRIGGER IF EXISTS holding_mappings_validate_portfolio ON public.holding_instrument_mappings;
CREATE TRIGGER holding_mappings_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.holding_instrument_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_portfolio_ownership();

DROP TRIGGER IF EXISTS transactions_validate_portfolio ON public.transactions;
CREATE TRIGGER transactions_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_portfolio_ownership();

DROP TRIGGER IF EXISTS transactions_validate_holding ON public.transactions;
CREATE TRIGGER transactions_validate_holding
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_holding_references();

DROP TRIGGER IF EXISTS transactions_sync_holding_aggregate ON public.transactions;
CREATE TRIGGER transactions_sync_holding_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_holding_aggregate();

DROP TRIGGER IF EXISTS import_jobs_validate_portfolio ON public.import_jobs;
CREATE TRIGGER import_jobs_validate_portfolio
  BEFORE INSERT OR UPDATE ON public.import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_portfolio_ownership();

DROP TRIGGER IF EXISTS import_rows_validate_references ON public.import_rows;
CREATE TRIGGER import_rows_validate_references
  BEFORE INSERT OR UPDATE ON public.import_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_import_row_references();

DROP TRIGGER IF EXISTS briefing_snapshots_validate_references ON public.briefing_snapshots;
CREATE TRIGGER briefing_snapshots_validate_references
  BEFORE INSERT OR UPDATE ON public.briefing_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_briefing_snapshot_references();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;
