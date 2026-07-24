import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";

export type PortfolioSyncKind = "migrate" | "sync";

export type PortfolioSyncStatus =
  | "loading"
  | "ready"
  | "migration_offer"
  | "conflict"
  | "syncing"
  | "sync_error"
  | "offline";

export type RemotePortfolioSnapshot = {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  importMappings: SavedImportMapping[];
  migrationCompletedAt: string | null;
  remoteUpdatedAt: string | null;
  portfolioId: string | null;
  holdingCount: number;
};

export type PortfolioSyncPreview = {
  holdingCount: number;
  investmentCount: number;
  cashCount: number;
  cashCurrencies: string[];
  hasGoal: boolean;
  mappingCount: number;
  fingerprint: string;
};

export type PortfolioSyncResolution =
  | { kind: "remote_only"; snapshot: RemotePortfolioSnapshot }
  | { kind: "local_only"; localHoldings: StoredPortfolioHolding[] }
  | { kind: "migration_offer"; preview: PortfolioSyncPreview }
  | { kind: "conflict"; localFingerprint: string; remoteFingerprint: string }
  | { kind: "aligned"; snapshot: RemotePortfolioSnapshot };

export type PortfolioApiResponse = {
  success: boolean;
  snapshot?: RemotePortfolioSnapshot;
  resolution?: PortfolioSyncResolution["kind"];
  error?: string;
  code?: string;
};

export type PortfolioMigrateRequest = {
  idempotencyKey: string;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  importMappings?: SavedImportMapping[];
  localFingerprint: string;
};

export type PortfolioSyncRequest = {
  idempotencyKey: string;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  importMappings?: SavedImportMapping[];
};

export type DbHoldingRow = {
  id: string;
  portfolio_id: string;
  user_id: string;
  asset_type: "investment" | "cash";
  symbol: string;
  name: string;
  quantity: number | string;
  average_cost: number | string;
  currency: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  last_market_price?: number | string | null;
  last_market_price_at?: string | null;
  previous_close?: number | string | null;
  holding_instrument_mappings?: DbMappingRow | DbMappingRow[] | null;
};

export type DbMappingRow = {
  holding_id: string;
  isin: string | null;
  exchange: string | null;
  provider_symbol: string | null;
  instrument_name: string | null;
  match_method: string | null;
  match_confidence: number | string | null;
  match_warnings: string[] | unknown;
  quote_currency: string | null;
  confirmed_at: string;
};

export type DbGoalRow = {
  id: string;
  target_value: number | string;
  target_year: number;
  monthly_contribution: number | string;
  expected_annual_return: number | string;
  passive_income_target: number | string | null;
  is_active: boolean;
  updated_at: string;
};

export type DbImportMappingRow = {
  id: string;
  lookup_key: string;
  isin: string | null;
  symbol: string;
  exchange: string | null;
  instrument_name: string | null;
  provider_symbol: string;
  match_method: string;
  quote_currency: string | null;
  confirmed_at: string;
};

export const PORTFOLIO_SYNC_VERSION = "phase2-v1";

export const SYNC_ERROR_CODES = {
  UNAUTHORIZED: "unauthorized",
  REMOTE_NOT_EMPTY: "remote_not_empty",
  CONFLICT: "conflict",
  VALIDATION: "validation",
  PROVIDER_FAILURE: "provider_failure",
  IDEMPOTENT_REPLAY: "idempotent_replay",
  PARTIAL_SAVE: "partial_save",
} as const;
