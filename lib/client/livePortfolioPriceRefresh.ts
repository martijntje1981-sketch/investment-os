/**
 * Explicit, quota-safe live price refresh for the user's portfolio.
 * Only this path should be used for manual "Refresh live prices" actions.
 */

import {
  applyCachedPrices,
  applyPricesToHoldings,
  buildPriceRequestPayload,
  countAppliedPriceUpdates,
  filterQuotablePricePayloadForRefresh,
  isLivePriceRefreshInFlight,
  isRateLimitedPriceError,
  parsePriceApiResponseQuotes,
  prepareHoldingsForPricing,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import {
  buildCryptoRefreshDiagnostics,
  shouldShowCryptoRefreshDiagnostics,
  type CryptoRefreshDiagnosticRecord,
} from "@/lib/client/cryptoRefreshDiagnostics";
import {
  __resetCacheFirstPriceQuotesForTests,
  fetchCacheFirstPriceQuotes,
} from "@/lib/client/cacheFirstPriceQuotes";
import { logLivePriceRefreshTrace } from "@/lib/client/marketDataRefreshTrace";
import { lastLivePriceRefreshKey } from "@/lib/client/portfolioStorageKeys";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import type {
  PortfolioInstrumentPayload,
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
  cryptoRefreshDiagnostics?: CryptoRefreshDiagnosticRecord[];
  showCryptoRefreshDiagnostics?: boolean;
};

let lastLiveRefreshCompletedAt = 0;
let liveRefreshInFlight: Promise<LivePriceRefreshResult<StoredPortfolioHolding>> | null =
  null;

export function countUniqueQuotableProviderSymbols(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): number {
  const keys = new Set<string>();

  for (const item of filterQuotablePricePayloadForRefresh(
    buildPriceRequestPayload(holdings, userSub),
  )) {
    if (item.assetType === "crypto") {
      const symbol = item.symbol?.trim().toUpperCase();
      const pairCurrency = item.pairCurrency?.trim().toUpperCase();
      if (symbol && pairCurrency) {
        keys.add(`${symbol}/${pairCurrency}`);
      }
      continue;
    }

    const providerSymbol = item.providerSymbol?.trim().toUpperCase();
    if (providerSymbol) {
      keys.add(providerSymbol);
    }
  }

  return keys.size;
}

export function readLastLivePriceRefreshAt(userSub: string): string | null {
  try {
    const raw = localStorage.getItem(lastLivePriceRefreshKey(userSub));
    if (!raw) {
      return null;
    }

    const trimmed = raw.trim();
    // Ignore legacy formatted strings; only accept ISO timestamps.
    if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      localStorage.removeItem(lastLivePriceRefreshKey(userSub));
      return null;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) {
      localStorage.removeItem(lastLivePriceRefreshKey(userSub));
      return null;
    }

    return new Date(parsed).toISOString();
  } catch {
    localStorage.removeItem(lastLivePriceRefreshKey(userSub));
    return null;
  }
}

/** Persists the client refresh moment as an ISO UTC timestamp. */
function recordLastLivePriceRefreshAt(userSub: string): void {
  localStorage.setItem(
    lastLivePriceRefreshKey(userSub),
    new Date().toISOString(),
  );
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

function buildNoPricesUpdatedMessage(): string {
  return "No live prices were updated.";
}

function buildQuotaExhaustedMessage(): string {
  return "The market-data limit has been reached. Your last available prices remain visible.";
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

function attachCryptoRefreshDiagnostics<T extends StoredPortfolioHolding>(
  result: LivePriceRefreshResult<T>,
  input: {
    preparedHoldings: T[];
    quotablePayload: PortfolioInstrumentPayload[];
    apiResponse: PriceApiResponse;
    beforeHoldings: T[];
    afterHoldings: T[];
    budgetBlocked?: boolean;
  },
): LivePriceRefreshResult<T> {
  if (result.updatedCount > 0) {
    return {
      ...result,
      cryptoRefreshDiagnostics: undefined,
      showCryptoRefreshDiagnostics: false,
    };
  }

  const diagnostics = buildCryptoRefreshDiagnostics({
    preparedHoldings: input.preparedHoldings,
    requestPayload: input.quotablePayload,
    apiResponse: input.apiResponse,
    beforeHoldings: input.beforeHoldings,
    afterHoldings: input.afterHoldings,
    budgetBlocked: input.budgetBlocked,
  });

  const showCryptoRefreshDiagnostics = shouldShowCryptoRefreshDiagnostics({
    updatedCount: result.updatedCount,
    diagnostics,
    message: result.message,
  });

  return {
    ...result,
    cryptoRefreshDiagnostics: diagnostics,
    showCryptoRefreshDiagnostics,
  };
}

export async function refreshLivePortfolioPrices<
  T extends StoredPortfolioHolding,
>(
  userSub: string,
  holdings: T[],
  options?: { cacheFirst?: boolean },
): Promise<LivePriceRefreshResult<T>> {
  const cacheFirst = options?.cacheFirst === true;
  const preparedHoldings = prepareHoldingsForPricing(holdings) as T[];
  const totalQuotable = countUniqueQuotableProviderSymbols(preparedHoldings, userSub);
  const uniqueRequested = totalQuotable;

  if (holdings.length === 0 || totalQuotable === 0) {
    return {
      holdings: applyCachedPrices(userSub, preparedHoldings),
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
  if (!cacheFirst && cooldownRemainingMs > 0) {
    return {
      holdings: applyCachedPrices(userSub, preparedHoldings),
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
      holdings: applyCachedPrices(userSub, preparedHoldings),
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
    buildPriceRequestPayload(preparedHoldings, userSub),
  );

  const run = (async (): Promise<LivePriceRefreshResult<T>> => {
    logLivePriceRefreshTrace("refresh_click", {
      uniqueRequested,
      totalQuotable,
      cacheFirst,
    });

    if (!cacheFirst) {
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
        return attachCryptoRefreshDiagnostics(
          {
            holdings: applyCachedPrices(userSub, preparedHoldings),
            updated: false,
            uniqueRequested,
            updatedCount: 0,
            totalQuotable,
            message:
              "The market-data limit has been reached. Your last available prices remain visible.",
            quotaExhausted: true,
            inProgress: false,
            cooldownRemainingMs: 0,
          },
          {
            preparedHoldings,
            quotablePayload,
            apiResponse: {
              ...estimateData,
              prices: [],
              errors: [],
              requested: quotablePayload.length,
              received: 0,
              canAffordRefresh: false,
            },
            beforeHoldings: preparedHoldings,
            afterHoldings: preparedHoldings,
            budgetBlocked: true,
          },
        );
      }
    }

    const quoted = cacheFirst
      ? await fetchCacheFirstPriceQuotes(userSub, quotablePayload)
      : await (async () => {
          const liveResponse = await fetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              holdings: quotablePayload,
              forceRefresh: true,
              estimateOnly: false,
            }),
            cache: "no-store",
          });
          return {
            ok: liveResponse.ok,
            data: (await liveResponse.json()) as PriceApiResponse,
          };
        })();

    const response = { ok: quoted.ok };
    const data = quoted.data;

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

    const normalizedQuotes = parsePriceApiResponseQuotes(data.prices);
    const cachedHoldings = applyCachedPrices(userSub, preparedHoldings);

    if (cacheFirst) {
      if (normalizedQuotes.length === 0) {
        const hasUsableCachedPrice = cachedHoldings.some(
          (holding) =>
            holding.assetType !== "cash" &&
            Number.isFinite(holding.currentPrice) &&
            holding.currentPrice > 0,
        );
        return {
          holdings: cachedHoldings,
          updated: false,
          uniqueRequested,
          updatedCount: 0,
          totalQuotable,
          message: hasUsableCachedPrice
            ? "Using last available prices."
            : "Prices could not be refreshed. Your last available prices remain visible.",
          quotaExhausted: false,
          inProgress: false,
          cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
        };
      }

      const refreshed = applyPricesToHoldings(preparedHoldings, normalizedQuotes, {
        clearMissingDailyFields: false,
      });
      const appliedCount = countAppliedPriceUpdates(preparedHoldings, refreshed);
      if (appliedCount === 0) {
        return {
          holdings: cachedHoldings,
          updated: false,
          uniqueRequested,
          updatedCount: 0,
          totalQuotable,
          message: buildNoPricesUpdatedMessage(),
          quotaExhausted: false,
          inProgress: false,
          cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
        };
      }

      writePriceCache(userSub, normalizedQuotes, {
        lastSuccessfulUpdate: data.lastSuccessfulUpdate ?? new Date().toISOString(),
        quoteSource: data.quoteSource ?? "cache",
      });

      logLivePriceRefreshTrace("holdings_applied", {
        quoteCount: normalizedQuotes.length,
        appliedCount,
        cacheFirst: true,
        lastUpdatedAt:
          refreshed.find((holding) => holding.marketPriceUpdatedAt)?.marketPriceUpdatedAt ??
          null,
      });

      return {
        holdings: refreshed,
        updated: true,
        uniqueRequested,
        updatedCount: appliedCount,
        totalQuotable,
        message: buildLiveRefreshSuccessMessage(appliedCount),
        quotaExhausted: false,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
        showCryptoRefreshDiagnostics: false,
      };
    }

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

    const refreshed = applyPricesToHoldings(preparedHoldings, normalizedQuotes, {
      clearMissingDailyFields: true,
    });
    const appliedCount = countAppliedPriceUpdates(preparedHoldings, refreshed);

    if (normalizedQuotes.length === 0 || appliedCount === 0) {
      lastLiveRefreshCompletedAt = Date.now();
      const received = data.received ?? normalizedQuotes.length;
      const providerFailure =
        isRateLimitedPriceError(data.message ?? data.error ?? "") ||
        Boolean(data.errors?.some((error) => isRateLimitedPriceError(error)));

      return attachCryptoRefreshDiagnostics(
        {
          holdings: cachedHoldings,
          updated: false,
          uniqueRequested,
          updatedCount: 0,
          totalQuotable,
          message:
            received > 0 || normalizedQuotes.length > 0
              ? buildNoPricesUpdatedMessage()
              : providerFailure
                ? buildQuotaExhaustedMessage()
                : buildNoPricesUpdatedMessage(),
          quotaExhausted: providerFailure && received === 0,
          inProgress: false,
          cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
        },
        {
          preparedHoldings,
          quotablePayload,
          apiResponse: data,
          beforeHoldings: preparedHoldings,
          afterHoldings: refreshed,
        },
      );
    }

    const lastSuccessfulUpdate =
      data.lastSuccessfulUpdate ?? new Date().toISOString();

    writePriceCache(userSub, normalizedQuotes, {
      lastSuccessfulUpdate,
      quoteSource: data.quoteSource ?? "provider",
    });
    recordLastLivePriceRefreshAt(userSub);

    lastLiveRefreshCompletedAt = Date.now();

    logLivePriceRefreshTrace("holdings_applied", {
      quoteCount: normalizedQuotes.length,
      appliedCount,
      lastUpdatedAt:
        refreshed.find((holding) => holding.marketPriceUpdatedAt)?.marketPriceUpdatedAt ??
        null,
    });

    if (appliedCount >= totalQuotable) {
      return {
        holdings: refreshed,
        updated: true,
        uniqueRequested,
        updatedCount: appliedCount,
        totalQuotable,
        message: buildLiveRefreshSuccessMessage(appliedCount),
        quotaExhausted: false,
        inProgress: false,
        cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
        showCryptoRefreshDiagnostics: false,
      };
    }

    return {
      holdings: refreshed,
      updated: true,
      uniqueRequested,
      updatedCount: appliedCount,
      totalQuotable,
      message: buildPartialRefreshMessage(appliedCount, totalQuotable),
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: getLivePriceRefreshCooldownRemainingMs(),
      showCryptoRefreshDiagnostics: false,
    };
  })();

  liveRefreshInFlight = run as Promise<LivePriceRefreshResult<StoredPortfolioHolding>>;

  try {
    return await run;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market data unavailable";
    return {
      holdings: applyCachedPrices(userSub, preparedHoldings),
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
  __resetCacheFirstPriceQuotesForTests();
  if (typeof localStorage !== "undefined") {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("investment-os-last-live-price-refresh:")) {
        localStorage.removeItem(key);
      }
    }
  }
}
