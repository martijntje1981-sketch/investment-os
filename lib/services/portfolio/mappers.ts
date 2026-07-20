import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";

import {
  portfolioFingerprint,
  resolveRemoteHoldingId,
} from "@/lib/services/portfolio/idempotency";
import { isValidMarketPrice } from "@/lib/client/portfolioPerformance";
import {
  normalizePassiveIncomeTarget,
  passiveIncomeTargetForDatabase,
} from "@/lib/client/goalPassiveIncome";
import type {
  DbGoalRow,
  DbHoldingRow,
  DbImportMappingRow,
  DbMappingRow,
  PortfolioSyncPreview,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";

const VALID_ISIN = /^[A-Z0-9]{12}$/;

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIsin(isin: string | null | undefined): string | null {
  if (!isin) return null;
  const normalized = String(isin).trim().toUpperCase();
  return VALID_ISIN.test(normalized) ? normalized : null;
}

function readMapping(row: DbHoldingRow): DbMappingRow | null {
  const mapping = row.holding_instrument_mappings;
  if (!mapping) return null;
  return Array.isArray(mapping) ? (mapping[0] ?? null) : mapping;
}

export function resolveStoredMarketPrice(
  row: Pick<DbHoldingRow, "asset_type" | "last_market_price">,
): number {
  if (row.asset_type === "cash") {
    return 1;
  }

  const cached = toNumber(row.last_market_price);
  return isValidMarketPrice(cached) ? cached : 0;
}

export function mapDbHoldingToStored(
  row: DbHoldingRow,
  localId?: string,
): StoredPortfolioHolding {
  const mapping = readMapping(row);
  const assetType = row.asset_type === "cash" ? "cash" : "investment";
  const quantity = toNumber(row.quantity);
  const purchasePrice = toNumber(row.average_cost);

  return {
    id: localId ?? row.id,
    symbol:
      assetType === "cash"
        ? String(row.currency).toUpperCase()
        : String(row.symbol).trim().toUpperCase(),
    name: row.name,
    quantity,
    purchasePrice: assetType === "cash" ? 1 : purchasePrice,
    currentPrice: resolveStoredMarketPrice(row),
    marketPriceUpdatedAt: row.last_market_price_at ?? undefined,
    currency: "EUR",
    assetType,
    isin: normalizeIsin(mapping?.isin),
    exchange: mapping?.exchange ?? null,
    providerSymbol: mapping?.provider_symbol ?? null,
    instrumentName: mapping?.instrument_name ?? null,
    matchMethod: mapping?.match_method ?? undefined,
    matchConfidence:
      mapping?.match_confidence != null
        ? toNumber(mapping.match_confidence)
        : undefined,
    requiresConfirmation: false,
    matchWarnings: Array.isArray(mapping?.match_warnings)
      ? (mapping.match_warnings as string[])
      : [],
    updatedAt: row.updated_at,
  };
}

export function mapDbGoalToStored(row: DbGoalRow | null): GoalSettings | null {
  if (!row) return null;

  const passiveIncomeTarget = normalizePassiveIncomeTarget(
    row.passive_income_target,
  );

  return {
    targetValue: toNumber(row.target_value),
    targetYear: row.target_year,
    monthlyContribution: toNumber(row.monthly_contribution),
    expectedAnnualReturn: toNumber(row.expected_annual_return),
    ...(passiveIncomeTarget !== undefined ? { passiveIncomeTarget } : {}),
  };
}

export function mapDbImportMapping(row: DbImportMappingRow): SavedImportMapping {
  return {
    id: row.id,
    lookupKey: row.lookup_key,
    isin: row.isin,
    symbol: row.symbol,
    exchange: row.exchange,
    instrumentName: row.instrument_name,
    providerSymbol: row.provider_symbol,
    matchMethod: row.match_method as SavedImportMapping["matchMethod"],
    confirmedAt: row.confirmed_at,
  };
}

export function mapStoredHoldingToDbInsert(
  holding: StoredPortfolioHolding,
  userId: string,
  portfolioId: string,
  sortOrder: number,
) {
  const assetType = holding.assetType === "cash" ? "cash" : "investment";
  const holdingId = resolveRemoteHoldingId(userId, holding.id);

  return {
    id: holdingId,
    portfolio_id: portfolioId,
    user_id: userId,
    asset_type: assetType,
    symbol:
      assetType === "cash"
        ? String(holding.currency).toUpperCase()
        : String(holding.symbol).trim().toUpperCase(),
    name: holding.name.trim() || holding.symbol,
    quantity: 0,
    average_cost: assetType === "cash" ? 1 : 0,
    currency: String(holding.currency ?? "EUR").toUpperCase(),
    sort_order: sortOrder,
    deleted_at: null,
  };
}

export function mapStoredMappingToDbInsert(
  holding: StoredPortfolioHolding,
  userId: string,
  portfolioId: string,
) {
  if (holding.assetType === "cash") return null;
  if (!holding.providerSymbol) return null;

  const isin = normalizeIsin(holding.isin);
  const holdingId = resolveRemoteHoldingId(userId, holding.id);

  return {
    holding_id: holdingId,
    user_id: userId,
    portfolio_id: portfolioId,
    isin,
    exchange: holding.exchange ?? null,
    provider: "eodhd",
    provider_symbol: holding.providerSymbol,
    instrument_name: holding.instrumentName ?? null,
    match_method: holding.matchMethod ?? "manual",
    match_confidence: holding.matchConfidence ?? 1,
    match_warnings: holding.matchWarnings ?? [],
    confirmed_at: new Date().toISOString(),
  };
}

export function mapSavedImportMappingToDbInsert(
  mapping: SavedImportMapping,
  userId: string,
) {
  return {
    id: mapping.id,
    user_id: userId,
    lookup_key: mapping.lookupKey,
    isin: normalizeIsin(mapping.isin),
    symbol: mapping.symbol,
    exchange: mapping.exchange,
    instrument_name: mapping.instrumentName,
    provider_symbol: mapping.providerSymbol,
    match_method: mapping.matchMethod,
    confirmed_at: mapping.confirmedAt,
  };
}

export function mapGoalToDbInsert(goal: GoalSettings, userId: string) {
  return {
    user_id: userId,
    target_value: goal.targetValue,
    target_year: goal.targetYear,
    monthly_contribution: goal.monthlyContribution,
    expected_annual_return: goal.expectedAnnualReturn,
    passive_income_target: passiveIncomeTargetForDatabase(
      goal.passiveIncomeTarget,
    ),
    is_active: true,
  };
}

export function buildSyncPreview(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  importMappings: SavedImportMapping[],
  userId?: string,
): PortfolioSyncPreview {
  const investments = holdings.filter((item) => item.assetType !== "cash");
  const cash = holdings.filter((item) => item.assetType === "cash");

  return {
    holdingCount: holdings.length,
    investmentCount: investments.length,
    cashCount: cash.length,
    cashCurrencies: cash.map((item) => item.symbol),
    hasGoal: goal != null,
    mappingCount: importMappings.length,
    fingerprint: portfolioFingerprint(holdings, userId),
  };
}

export function buildRemoteSnapshot(
  rows: DbHoldingRow[],
  goal: DbGoalRow | null,
  importMappings: DbImportMappingRow[],
  migrationCompletedAt: string | null,
  portfolioId: string | null,
): RemotePortfolioSnapshot {
  const holdings = rows.map((row) => mapDbHoldingToStored(row));

  const remoteUpdatedAt =
    rows.reduce<string | null>((latest, row) => {
      if (!latest || row.updated_at > latest) return row.updated_at;
      return latest;
    }, null) ?? goal?.updated_at ?? migrationCompletedAt;

  return {
    holdings,
    goal: mapDbGoalToStored(goal),
    importMappings: importMappings.map(mapDbImportMapping),
    migrationCompletedAt,
    remoteUpdatedAt,
    portfolioId,
    holdingCount: holdings.length,
  };
}

export function sanitizeLocalHoldings(
  holdings: unknown,
): StoredPortfolioHolding[] {
  if (!Array.isArray(holdings)) return [];

  const normalized: StoredPortfolioHolding[] = [];

  for (const item of holdings) {
    if (!item || typeof item !== "object") continue;

    const holding = item as StoredPortfolioHolding;
    const assetType: "investment" | "cash" =
      holding.assetType === "cash" ? "cash" : "investment";
    const quantity = Number(holding.quantity);
    const purchasePrice = Number(holding.purchasePrice);

    if (!Number.isFinite(quantity) || quantity < 0) continue;
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) continue;

    const symbol = String(holding.symbol ?? "")
      .trim()
      .toUpperCase();
    if (!symbol) continue;

    normalized.push({
      ...holding,
      id: String(holding.id ?? crypto.randomUUID()),
      symbol,
      name: String(holding.name ?? symbol).trim() || symbol,
      quantity,
      purchasePrice: assetType === "cash" ? 1 : purchasePrice,
      currentPrice:
        assetType === "cash"
          ? 1
          : Number.isFinite(Number(holding.currentPrice))
            ? Number(holding.currentPrice)
            : 0,
      currency: "EUR",
      assetType,
      isin: normalizeIsin(holding.isin),
    });
  }

  return normalized;
}
