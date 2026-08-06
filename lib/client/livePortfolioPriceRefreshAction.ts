/**
 * Shared orchestration for the manual "Refresh prices" action.
 * Pure module (no React) so Portfolio and Dashboard share one refresh path.
 */

import type { CryptoRefreshDiagnosticRecord } from "@/lib/client/cryptoRefreshDiagnostics";
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
};

export type LivePortfolioPriceRefreshActionOutcome = {
  updated: boolean;
  message: string;
  liveRefreshAt: string | null;
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

function resolvePostRefreshStatus(
  result: Pick<
    LivePriceRefreshResult<StoredPortfolioHolding>,
    "updated" | "quotaExhausted" | "inProgress" | "cooldownRemainingMs" | "message"
  >,
): LivePortfolioPriceRefreshActionOutcome["status"] {
  if (result.updated) {
    return "success";
  }

  if (result.inProgress || result.cooldownRemainingMs > 0) {
    return "idle";
  }

  if (
    result.quotaExhausted ||
    /could not be refreshed|market-data limit|No live prices were updated/i.test(
      result.message,
    )
  ) {
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
  } = input;

  const uniqueCount = countUniqueQuotableProviderSymbols(holdings, userSub);
  if (uniqueCount === 0) {
    return {
      updated: false,
      message: NO_QUOTABLE_REFRESH_MESSAGE,
      liveRefreshAt: readLastLivePriceRefreshAt(userSub),
      fxRecoveryRequested: false,
      status: "idle",
      uniqueRequested: 0,
      updatedCount: 0,
      totalQuotable: 0,
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: 0,
      holdings,
    };
  }

  const result = await refreshLivePortfolioPrices(userSub, holdings);
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

  return {
    updated: result.updated,
    message: result.message,
    liveRefreshAt,
    fxRecoveryRequested,
    status: resolvePostRefreshStatus(result),
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
