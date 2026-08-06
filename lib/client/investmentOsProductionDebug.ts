/**
 * TEMPORARY production diagnostics — remove after verifying deployed dashboard
 * build and STRC price source. Search: baaec00-dashboard-debug
 */

import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/** Visible on /dashboard and echoed in console logs. */
export const PRODUCTION_DEBUG_BUILD_MARKER = "baaec00-dashboard-debug";

export const PRODUCTION_DEBUG_LOG_PREFIX = "[INVESTMENT_OS_DEBUG]";

export type RemoteHydrateSource = "local" | "remote" | "merged";

export type StrcQuoteSelectionSnapshot = {
  cacheKey: string | null;
  matchedQuoteProviderSymbol: string | null;
  matchedQuotePriceEur: number | null;
};

function inferStrcPriceSource(
  beforeCache: StoredPortfolioHolding,
  afterCache: StoredPortfolioHolding,
  matchedCacheKey: string | null,
): "price_cache" | "local_storage" | "unchanged" {
  if (matchedCacheKey) {
    const priceChanged =
      beforeCache.currentPrice !== afterCache.currentPrice ||
      afterCache.priceDataStatus !== beforeCache.priceDataStatus;
    if (priceChanged || afterCache.priceDataStatus !== "stale") {
      return "price_cache";
    }
  }

  if (
    Number.isFinite(beforeCache.currentPrice) &&
    beforeCache.currentPrice > 0 &&
    beforeCache.currentPrice === afterCache.currentPrice
  ) {
    return "local_storage";
  }

  return "unchanged";
}

/** Logs once when /dashboard becomes ready. */
export function logDashboardProductionDiagnostics(input: {
  route: string;
  dashboardSummaryRendered: boolean;
  dashboardTodaysDecisionRendered: boolean;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  console.log(PRODUCTION_DEBUG_LOG_PREFIX, "dashboard mount", {
    route: input.route,
    buildMarker: PRODUCTION_DEBUG_BUILD_MARKER,
    dashboardSummaryRendered: input.dashboardSummaryRendered,
    dashboardTodaysDecisionRendered: input.dashboardTodaysDecisionRendered,
  });
}

/** Logs STRC quote resolution during loadUserPortfolioHoldings. */
export function logStrcPortfolioLoadDiagnostics(input: {
  beforeCache: StoredPortfolioHolding;
  afterCache: StoredPortfolioHolding;
  selection: StrcQuoteSelectionSnapshot;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  const { beforeCache, afterCache, selection } = input;
  const displayPrice = resolveHoldingDisplayPrice(afterCache);
  const finalMarketValue = getHoldingMarketValue(afterCache);

  console.log(PRODUCTION_DEBUG_LOG_PREFIX, "STRC portfolio load", {
    symbol: beforeCache.symbol,
    providerSymbol: beforeCache.providerSymbol ?? null,
    isin: beforeCache.isin ?? null,
    exchange: beforeCache.exchange ?? null,
    quantity: beforeCache.quantity,
    currentPriceBeforeCacheApply: beforeCache.currentPrice,
    matchedCacheKey: selection.cacheKey,
    matchedQuoteProviderSymbol: selection.matchedQuoteProviderSymbol,
    matchedQuotePriceEur: selection.matchedQuotePriceEur,
    resolvedDisplayPrice: displayPrice.price,
    resolvedDisplayPriceSource: displayPrice.source,
    priceDataStatus: afterCache.priceDataStatus ?? null,
    currentPriceAfterCacheApply: afterCache.currentPrice,
    finalMarketValue,
    inferredPriceSource: inferStrcPriceSource(
      beforeCache,
      afterCache,
      selection.cacheKey,
    ),
  });
}

/** Logs portfolio hydrate outcome from useUserPortfolio. */
export function logRemoteHydrateProductionDiagnostics(input: {
  hydrateSource: RemoteHydrateSource;
  remoteSnapshotApplied: boolean;
  strcRemotePriceReplacedLocal: boolean | null;
  strcLocalPrice: number | null;
  strcRemotePrice: number | null;
  strcMergedPrice: number | null;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  console.log(PRODUCTION_DEBUG_LOG_PREFIX, "portfolio hydrate", {
    hydrateSource: input.hydrateSource,
    remoteSnapshotApplied: input.remoteSnapshotApplied,
    strcRemotePriceReplacedLocal: input.strcRemotePriceReplacedLocal,
    strcLocalPrice: input.strcLocalPrice,
    strcRemotePrice: input.strcRemotePrice,
    strcMergedPrice: input.strcMergedPrice,
  });
}

/** Logs STRC price merge inside applyRemoteSnapshotToLocalCache. */
export function logStrcRemoteSyncMergeDiagnostics(input: {
  context: "hydrate" | "push_response" | "conflict_resolution";
  localPrice: number | null;
  remotePrice: number | null;
  mergedPrice: number;
  remoteReplacedLocal: boolean;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  console.log(PRODUCTION_DEBUG_LOG_PREFIX, "STRC remote sync merge", {
    context: input.context,
    localPrice: input.localPrice,
    remotePrice: input.remotePrice,
    mergedPrice: input.mergedPrice,
    remoteReplacedLocal: input.remoteReplacedLocal,
    inferredPriceSource: input.remoteReplacedLocal ? "remote_sync" : "local_storage",
  });
}
