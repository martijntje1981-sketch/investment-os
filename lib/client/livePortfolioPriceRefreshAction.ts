/**
 * Shared orchestration for the manual "Refresh prices" action.
 * Pure module (no React) so Portfolio and Dashboard share one refresh path.
 */

import type { CryptoRefreshDiagnosticRecord } from "@/lib/client/cryptoRefreshDiagnostics";
import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import { readPortfolioDisplayFreshness } from "@/lib/client/portfolioDisplayFreshness";
import {
  buildLiveRefreshPreviewMessage,
  countUniqueQuotableProviderSymbols,
  readLastLivePriceRefreshAt,
  refreshLivePortfolioPrices,
  type LivePriceRefreshResult,
} from "@/lib/client/livePortfolioPriceRefresh";
import type { BaseCurrencyFxStatus } from "@/lib/services/prices/baseCurrencyFxSnapshot";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const NO_QUOTABLE_REFRESH_MESSAGE =
  "No holdings are eligible for live pricing yet. Add a matched listing or provider symbol, then refresh again.";

export type RefreshPricesUiStatus = "idle" | "loading" | "success" | "error";

export type LivePortfolioPriceRefreshActionInput = {
  userSub: string;
  holdings: StoredPortfolioHolding[];
  saveHoldings: (next: StoredPortfolioHolding[]) => void;
  baseCurrency: PortfolioBaseCurrency;
  fxStatus: BaseCurrencyFxStatus;
  refreshFx: () => void;
  cacheFirst?: boolean;
};

export type LivePortfolioPriceRefreshActionOutcome = {
  updated: boolean;
  message: string;
  liveRefreshAt: string | null;
  displayFreshnessAt: string | null;
  fxRecoveryRequested: boolean;
  status: Exclude<RefreshPricesUiStatus, "loading" | "idle"> | "idle";
  uniqueRequested: number;
  updatedCount: number;
  totalQuotable: number;
  quotaExhausted: boolean;
  inProgress: boolean;
  cooldownRemainingMs: number;
  cryptoRefreshDiagnostics?: CryptoRefreshDiagnosticRecord[];
  showCryptoRefreshDiagnostics?: boolean;
  holdings: StoredPortfolioHolding[];
};

const lastRefreshUiByUser = new Map<
  string,
  { status: LivePortfolioPriceRefreshActionOutcome["status"]; message: string }
>();

export function readLivePriceRefreshUiState(userSub: string | null): {
  status: LivePortfolioPriceRefreshActionOutcome["status"];
  message: string;
} | null {
  if (!userSub) return null;
  return lastRefreshUiByUser.get(userSub) ?? null;
}

export function resetLivePriceRefreshUiStateForTests(): void {
  lastRefreshUiByUser.clear();
}

function holdingsHaveUsablePrices(holdings: StoredPortfolioHolding[]): boolean {
  return holdings.some((holding) => {
    if (holding.assetType === "cash") return false;
    const display = resolveHoldingDisplayPrice(holding);
    return display.price != null && display.source !== "unavailable";
  });
}

function resolvePostRefreshStatus(
  result: Pick<
    LivePriceRefreshResult<StoredPortfolioHolding>,
    "updated" | "quotaExhausted" | "inProgress" | "cooldownRemainingMs" | "message"
  >,
  options?: { cacheFirst?: boolean; hasUsablePrices?: boolean },
): LivePortfolioPriceRefreshActionOutcome["status"] {
  if (result.updated) {
    return "success";
  }

  if (result.inProgress || result.cooldownRemainingMs > 0) {
    return "idle";
  }

  if (result.quotaExhausted) {
    return "error";
  }

  const failedRefreshCopy =
    /could not be refreshed|market-data limit|No live prices were updated/i.test(
      result.message,
    );

  // Cache-first miss with last-known-good prices is reconciliation, not a failed refresh.
  if (options?.cacheFirst && options.hasUsablePrices && !failedRefreshCopy) {
    return "idle";
  }

  if (failedRefreshCopy) {
    return "error";
  }

  return "idle";
}

/**
 * Runs the shared live refresh path, persists holdings on success, and
 * conditionally recovers presentation FX when it is unavailable (non-EUR only).
 */
export async function runLivePortfolioPriceRefreshAction(
  input: LivePortfolioPriceRefreshActionInput,
): Promise<LivePortfolioPriceRefreshActionOutcome> {
  const {
    userSub,
    holdings,
    saveHoldings,
    baseCurrency,
    fxStatus,
    refreshFx,
    cacheFirst,
  } = input;

  const uniqueCount = countUniqueQuotableProviderSymbols(holdings, userSub);
  if (uniqueCount === 0) {
    const idle = {
      updated: false,
      message: NO_QUOTABLE_REFRESH_MESSAGE,
      liveRefreshAt: readLastLivePriceRefreshAt(userSub),
      displayFreshnessAt: readPortfolioDisplayFreshness(userSub),
      fxRecoveryRequested: false,
      status: "idle" as const,
      uniqueRequested: 0,
      updatedCount: 0,
      totalQuotable: 0,
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: 0,
      holdings,
    };
    lastRefreshUiByUser.set(userSub, {
      status: idle.status,
      message: idle.message,
    });
    return idle;
  }

  const result = await refreshLivePortfolioPrices(userSub, holdings, {
    cacheFirst,
  });
  let fxRecoveryRequested = false;
  let liveRefreshAt = readLastLivePriceRefreshAt(userSub);
  let nextHoldings = result.holdings;

  if (result.updated) {
    saveHoldings(result.holdings);
    nextHoldings = result.holdings;
    liveRefreshAt = readLastLivePriceRefreshAt(userSub);

    // Keep market-price refresh separate from presentation FX, but recover a
    // stuck unavailable FX snapshot after a successful refresh may have warmed
    // the shared PriceService FX cache. EUR never requests FX.
    if (baseCurrency !== "EUR" && fxStatus === "unavailable") {
      refreshFx();
      fxRecoveryRequested = true;
    }
  }

  const status = resolvePostRefreshStatus(result, {
    cacheFirst: Boolean(cacheFirst),
    hasUsablePrices: holdingsHaveUsablePrices(nextHoldings),
  });
  lastRefreshUiByUser.set(userSub, { status, message: result.message });

  return {
    updated: result.updated,
    message: result.message,
    liveRefreshAt,
    displayFreshnessAt: readPortfolioDisplayFreshness(userSub),
    fxRecoveryRequested,
    status,
    uniqueRequested: result.uniqueRequested,
    updatedCount: result.updatedCount,
    totalQuotable: result.totalQuotable,
    quotaExhausted: result.quotaExhausted,
    inProgress: result.inProgress,
    cooldownRemainingMs: result.cooldownRemainingMs,
    cryptoRefreshDiagnostics: result.cryptoRefreshDiagnostics,
    showCryptoRefreshDiagnostics: result.showCryptoRefreshDiagnostics,
    holdings: nextHoldings,
  };
}

export function buildRefreshPreviewMessageForHoldings(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
): string | null {
  if (!userSub) return null;
  const uniqueCount = countUniqueQuotableProviderSymbols(holdings, userSub);
  if (uniqueCount === 0) return null;
  return buildLiveRefreshPreviewMessage(uniqueCount);
}
