-- Phase 1: Row Level Security policies
-- Every user-owned row is scoped to auth.uid().

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_instrument_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_snapshots ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- user_settings
DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- portfolios
DROP POLICY IF EXISTS portfolios_select_own ON public.portfolios;
CREATE POLICY portfolios_select_own
  ON public.portfolios
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS portfolios_insert_own ON public.portfolios;
CREATE POLICY portfolios_insert_own
  ON public.portfolios
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolios_update_own ON public.portfolios;
CREATE POLICY portfolios_update_own
  ON public.portfolios
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portfolios_delete_own ON public.portfolios;
CREATE POLICY portfolios_delete_own
  ON public.portfolios
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- holdings
DROP POLICY IF EXISTS holdings_select_own ON public.holdings;
CREATE POLICY holdings_select_own
  ON public.holdings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS holdings_insert_own ON public.holdings;
CREATE POLICY holdings_insert_own
  ON public.holdings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS holdings_update_own ON public.holdings;
CREATE POLICY holdings_update_own
  ON public.holdings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS holdings_delete_own ON public.holdings;
CREATE POLICY holdings_delete_own
  ON public.holdings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- holding_instrument_mappings
DROP POLICY IF EXISTS holding_mappings_select_own ON public.holding_instrument_mappings;
CREATE POLICY holding_mappings_select_own
  ON public.holding_instrument_mappings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS holding_mappings_insert_own ON public.holding_instrument_mappings;
CREATE POLICY holding_mappings_insert_own
  ON public.holding_instrument_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS holding_mappings_update_own ON public.holding_instrument_mappings;
CREATE POLICY holding_mappings_update_own
  ON public.holding_instrument_mappings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS holding_mappings_delete_own ON public.holding_instrument_mappings;
CREATE POLICY holding_mappings_delete_own
  ON public.holding_instrument_mappings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- transactions
DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
CREATE POLICY transactions_select_own
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
CREATE POLICY transactions_insert_own
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
CREATE POLICY transactions_update_own
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS transactions_delete_own ON public.transactions;
CREATE POLICY transactions_delete_own
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- financial_goals
DROP POLICY IF EXISTS financial_goals_select_own ON public.financial_goals;
CREATE POLICY financial_goals_select_own
  ON public.financial_goals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS financial_goals_insert_own ON public.financial_goals;
CREATE POLICY financial_goals_insert_own
  ON public.financial_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS financial_goals_update_own ON public.financial_goals;
CREATE POLICY financial_goals_update_own
  ON public.financial_goals
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS financial_goals_delete_own ON public.financial_goals;
CREATE POLICY financial_goals_delete_own
  ON public.financial_goals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- import_jobs
DROP POLICY IF EXISTS import_jobs_select_own ON public.import_jobs;
CREATE POLICY import_jobs_select_own
  ON public.import_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS import_jobs_insert_own ON public.import_jobs;
CREATE POLICY import_jobs_insert_own
  ON public.import_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS import_jobs_update_own ON public.import_jobs;
CREATE POLICY import_jobs_update_own
  ON public.import_jobs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS import_jobs_delete_own ON public.import_jobs;
CREATE POLICY import_jobs_delete_own
  ON public.import_jobs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- import_rows
DROP POLICY IF EXISTS import_rows_select_own ON public.import_rows;
CREATE POLICY import_rows_select_own
  ON public.import_rows
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS import_rows_insert_own ON public.import_rows;
CREATE POLICY import_rows_insert_own
  ON public.import_rows
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS import_rows_update_own ON public.import_rows;
CREATE POLICY import_rows_update_own
  ON public.import_rows
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS import_rows_delete_own ON public.import_rows;
CREATE POLICY import_rows_delete_own
  ON public.import_rows
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- briefing_snapshots
DROP POLICY IF EXISTS briefing_snapshots_select_own ON public.briefing_snapshots;
CREATE POLICY briefing_snapshots_select_own
  ON public.briefing_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS briefing_snapshots_insert_own ON public.briefing_snapshots;
CREATE POLICY briefing_snapshots_insert_own
  ON public.briefing_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS briefing_snapshots_update_own ON public.briefing_snapshots;
CREATE POLICY briefing_snapshots_update_own
  ON public.briefing_snapshots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS briefing_snapshots_delete_own ON public.briefing_snapshots;
CREATE POLICY briefing_snapshots_delete_own
  ON public.briefing_snapshots
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
