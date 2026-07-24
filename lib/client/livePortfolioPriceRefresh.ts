/**
 * Explicit, quota-safe live price refresh for the user's portfolio.
 * Only this path should be used for manual "Refresh live prices" actions.
 */

import {
  applyCachedPrices,
  applyPricesToHoldings,
  buildPriceRequestPayload,
  filterQuotablePricePayloadForRefresh,
  isLivePriceRefreshInFlight,
  isRateLimitedPriceError,
  normalizePriceApiQuotes,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import { logLivePriceRefreshTrace } from "@/lib/client/marketDataRefreshTrace";
import { lastLivePriceRefreshKey } from "@/lib/client/portfolioStorageKeys";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import type {
  PriceApiQuote,
  PriceApiResponse,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

export const LIVE_PRICE_REFRESH_COOLDOWN_MS = 60_000;

export type LivePriceRefreshResult<T extends StoredPortfolioHolding> = {
  holdings: T[];
  updated: boolean;
  uniqueRequested: number;
  updatedCount: number;
  totalQuotable: number;
  message: string;
  quotaExhausted: boolean;
  inProgress: boolean;
  cooldownRemainingMs: number;
};

let lastLiveRefreshCompletedAt = 0;
let liveRefreshInFlight: Promise<LivePriceRefreshResult<StoredPortfolioHolding>> | null =
  null;

export function countUniqueQuotableProviderSymbols(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): number {
  const symbols = new Set<string>();
  for (const item of buildPriceRequestPayload(holdings, userSub)) {
    const providerSymbol = item.providerSymbol?.trim().toUpperCase();
    if (providerSymbol) {
      symbols.add(providerSymbol);
    }
  }
  return symbols.size;
}

export function readLastLivePriceRefreshAt(userSub: string): string | null {
  try {
    const raw = localStorage.getItem(lastLivePriceRefreshKey(userSub));
    if (!raw) {
      return null;
    }

    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  } catch {
    return null;
  }
}

function recordLastLivePriceRefreshAt(userSub: string, iso: string): void {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return;
  }

  localStorage.setItem(lastLivePriceRefreshKey(userSub), new Date(parsed).toISOString());
}

export function getLivePriceRefreshCooldownRemainingMs(
  now = Date.now(),
): number {
  if (lastLiveRefreshCompletedAt <= 0) {
    return 0;
  }
  return Math.max(0, LIVE_PRICE_REFRESH_COOLDOWN_MS - (now - lastLiveRefreshCompletedAt));
}

export function buildLiveRefreshPreviewMessage(uniqueCount: number): string {
  return `This will request live prices for ${uniqueCount} unique holdings.`;
}

function buildLiveRefreshSuccessMessage(updatedCount: number): string {
  return `Live prices updated for ${updatedCount} holdings.`;
}

function buildPartialRefreshMessage(
  updatedCount: number,
  totalQuotable: number,
): string {
  return `Updated ${updatedCount} of ${totalQuotable} holdings. Last known prices are shown for the remainder.`;
}

function buildQuotaExhaustedMessage(): string {
  return "The market-data limit has been reached. Your last available prices remain visible.";
}

function countUpdatedHoldings<T extends StoredPortfolioHolding>(
  before: T[],
  after: T[],
): number {
  return after.filter((holding, index) => {
    const previous = before[index];
    if (!previous || holding.assetType === "cash") {
      return false;
    }
    return holding.currentPrice !== previous.currentPrice;
  }).length;
}

function isQuotaExhaustedResponse(
  data: PriceApiResponse,
  message: string,
  receivedQuoteCount: number,
): boolean {
  if (receivedQuoteCount > 0) {
    return false;
  }

  if (isRateLimitedPriceError(message)) {
    return true;
  }

  if (isRateLimitedPriceError(data.error ?? "")) {
    return true;
  }

  return Boolean(
    data.errors?.some((error) => isRateLimitedPriceError(error)),
  );
}

function isStaleOnlyRefreshResponse(
  data: PriceApiResponse,
  quotes: PriceApiQuote[],
): boolean {
  if (quotes.length === 0) {
    return false;
  }

  const hasLiveQuote = quotes.some(
    (quote) => quote.dataStatus === "live" || quote.dataStatus === "delayed",
  );
  if (hasLiveQuote) {
    return false;
  }

  const providerCallsMade = data.refreshSummary?.providerCallsMade ?? 0;
  return data.quoteSource === "cache" || providerCallsMade === 0;
}

export async function refreshLivePortfolioPrices<
  T extends StoredPortfolioHolding,
>(userSub: string, holdings: T[]): Promise<LivePriceRefreshResult<T>> {
  const totalQuotable = countUniqueQuotableProviderSymbols(holdings, userSub);
  const uniqueRequested = totalQuotable;

  if (holdings.length === 0 || totalQuotable === 0) {
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      uniqueRequested: 0,
      updatedCount: 0,
      totalQuotable: 0,
      message: NO_QUOTABLE_HOLDINGS_MESSAGE,
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: 0,
    };
  }

  const cooldownRemainingMs = getLivePriceRefreshCooldownRemainingMs();
  if (cooldownRemainingMs > 0) {
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      uniqueRequested,
      updatedCount: 0,
      totalQuotable,
      message: "Live price refresh is cooling down. Your last available prices remain visible.",
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs,
    };
  }

  if (liveRefreshInFlight || isLivePriceRefreshInFlight()) {
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      uniqueRequested,
      updatedCount: 0,
      totalQuotable,
      message: "Live price refresh already in progress.",
      quotaExhausted: false,
      inProgress: true,
      cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
    };
  }

  const quotablePayload = filterQuotablePricePayloadForRefresh(
    buildPriceRequestPayload(holdings, userSub),
  );

  const run = (async (): Promise<LivePriceRefreshResult<T>> => {
    logLivePriceRefreshTrace("refresh_click", {
      uniqueRequested,
      totalQuotable,
    });

    const estimateResponse = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdings: quotablePayload,
        forceRefresh: true,
        estimateOnly: true,
      }),
      cache: "no-store",
    });

    const estimateData = (await estimateResponse.json()) as PriceApiResponse;
    const totalRequired =
      estimateData.refreshSummary?.totalCallsRequired ??
      (estimateData.refreshSummary?.providerCallsRequired ?? uniqueRequested);
    const canAfford =
      estimateData.canAffordRefresh ??
      (estimateData.eodhdBudget
        ? totalRequired <= estimateData.eodhdBudget.spendableRemaining
        : true);

    if (!canAfford) {
      logLivePriceRefreshTrace("budget_blocked", {
        totalRequired,
        spendableRemaining: estimateData.eodhdBudget?.spendableRemaining ?? null,
      });
      return {
        holdings: applyCachedPrices(userSub, holdings),
        updated: false,
        uniqueRequested,
        updatedCount: 0,
        totalQuotable,
        message:
          "The market-data limit has been reached. Your last available prices remain visible.",
        quotaExhausted: true,
        inProgress: false,
        cooldownRemainingMs: 0,
      };
    }

    const response = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdings: quotablePayload,
        forceRefresh: true,
        estimateOnly: false,
      }),
      cache: "no-store",
    });

    const data = (await response.json()) as PriceApiResponse;

    logLivePriceRefreshTrace("api_response", {
      ok: response.ok,
      success: data.success,
      requested: data.requested ?? uniqueRequested,
      received: data.received ?? data.prices?.length ?? 0,
      quoteSource: data.quoteSource ?? null,
      circuitOpen: data.refreshSummary?.circuitOpen ?? null,
      providerCallsMade: data.refreshSummary?.providerCallsMade ?? null,
      lastSuccessfulUpdate: data.lastSuccessfulUpdate ?? null,
    });

    if (!response.ok && !data.success && !data.refreshSummary) {
      throw new Error(data.error ?? data.message ?? "Market data unavailable");
    }

    const normalizedQuotes = normalizePriceApiQuotes(data.prices);
    const cachedHoldings = applyCachedPrices(userSub, holdings);

    if (
      isQuotaExhaustedResponse(
        data,
        data.message ?? data.error ?? "",
        normalizedQuotes.length,
      )
    ) {
      lastLiveRefreshCompletedAt = Date.now();
      logLivePriceRefreshTrace("quota_exhausted", {
        quoteCount: normalizedQuotes.length,
      });
      return {
        holdings: cachedHoldings,
        updated: false,
        uniqueRequested,
        updatedCount: 0,
        totalQuotable,
        message: buildQuotaExhaustedMessage(),
        quotaExhausted: true,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
      };
    }

    if (isStaleOnlyRefreshResponse(data, normalizedQuotes)) {
      lastLiveRefreshCompletedAt = Date.now();
      logLivePriceRefreshTrace("stale_only_response", {
        quoteCount: normalizedQuotes.length,
        quoteSource: data.quoteSource ?? null,
      });
      return {
        holdings: cachedHoldings,
        updated: false,
        uniqueRequested,
        updatedCount: 0,
        totalQuotable,
        message: buildQuotaExhaustedMessage(),
        quotaExhausted: true,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
      };
    }

    if (normalizedQuotes.length === 0) {
      lastLiveRefreshCompletedAt = Date.now();
      const received = data.received ?? 0;
      return {
        holdings: cachedHoldings,
        updated: false,
        uniqueRequested,
        updatedCount: 0,
        totalQuotable,
        message:
          received > 0
            ? buildPartialRefreshMessage(received, totalQuotable)
            : buildQuotaExhaustedMessage(),
        quotaExhausted: received === 0,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
      };
    }

    const lastSuccessfulUpdate =
      data.lastSuccessfulUpdate ?? new Date().toISOString();

    writePriceCache(userSub, data.prices, {
      lastSuccessfulUpdate,
      quoteSource: data.quoteSource ?? "provider",
    });
    recordLastLivePriceRefreshAt(userSub, lastSuccessfulUpdate);

    const refreshed = applyPricesToHoldings(holdings, data.prices, {
      clearMissingDailyFields: true,
    });
    const updatedCount = Math.max(
      countUpdatedHoldings(holdings, refreshed),
      normalizedQuotes.length,
    );
    lastLiveRefreshCompletedAt = Date.now();

    logLivePriceRefreshTrace("holdings_applied", {
      quoteCount: normalizedQuotes.length,
      updatedCount,
      lastUpdatedAt:
        refreshed.find((holding) => holding.marketPriceUpdatedAt)?.marketPriceUpdatedAt ??
        null,
    });

    if (normalizedQuotes.length >= totalQuotable) {
      return {
        holdings: refreshed,
        updated: true,
        uniqueRequested,
        updatedCount: normalizedQuotes.length,
        totalQuotable,
        message: buildLiveRefreshSuccessMessage(normalizedQuotes.length),
        quotaExhausted: false,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
      };
    }

    return {
      holdings: refreshed,
      updated: updatedCount > 0,
      uniqueRequested,
      updatedCount,
      totalQuotable,
      message: buildPartialRefreshMessage(updatedCount, totalQuotable),
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
    };
  })();

  liveRefreshInFlight = run as Promise<LivePriceRefreshResult<StoredPortfolioHolding>>;

  try {
    return await run;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market data unavailable";
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      uniqueRequested,
      updatedCount: 0,
      totalQuotable,
      message: isRateLimitedPriceError(message)
        ? buildQuotaExhaustedMessage()
        : "Live prices could not be refreshed. Your last available prices remain visible.",
      quotaExhausted: isRateLimitedPriceError(message),
      inProgress: false,
      cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
    };
  } finally {
    liveRefreshInFlight = null;
  }
}

export function resetLivePriceRefreshStateForTests(): void {
  lastLiveRefreshCompletedAt = 0;
  liveRefreshInFlight = null;
  if (typeof localStorage !== "undefined") {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("investment-os-last-live-price-refresh:")) {
        localStorage.removeItem(key);
      }
    }
  }
}
