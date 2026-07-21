/**
 * Shared client-side portfolio pricing pipeline.
 *
 * Used by portfolio, dashboard, and detail pages so every surface resolves
 * live prices through the same POST /api/prices + providerSymbol join logic.
 * All storage operations require the authenticated user's stable id (sub).
 */

import {
  assertUserSub,
  priceCacheKey,
} from "@/lib/client/portfolioStorageKeys";
import {
  readPortfolioFromStorage,
  writePortfolioToStorage,
  dispatchPortfolioUpdated,
  resolveVisiblePortfolioState,
  requestLegacyPortfolioMigration,
  tryExplicitLegacyPortfolioMigration,
  readScopedHoldingsRaw,
  isScopedPortfolioEmpty,
} from "@/lib/client/userPortfolioStorage";
import {
  type CachedPortfolioPrice,
  type PortfolioInstrumentPayload,
  type PriceApiQuote,
  type PriceApiResponse,
  type StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";
import {
  normalizeMarketQuote,
  type MarketDataStatus,
} from "@/lib/services/prices/marketQuote";
import { logHoldingDailyData } from "@/lib/client/holdingDailyDataDebug";
import { findSavedMappingForHolding } from "@/lib/services/import/mappingMemory";

export {
  LEGACY_PORTFOLIO_STORAGE_KEY,
  LEGACY_PRICE_CACHE_KEY,
  portfolioStorageKey,
  priceCacheKey,
  goalStorageKey,
  annualContributionKey,
  PORTFOLIO_HOLDINGS_UPDATED_EVENT,
} from "@/lib/client/portfolioStorageKeys";

export {
  PORTFOLIO_STORAGE_KEY,
  PRICE_CACHE_KEY,
} from "@/lib/types/portfolioStorage";

export {
  readPortfolioFromStorage,
  writePortfolioToStorage,
  dispatchPortfolioUpdated,
  resolveVisiblePortfolioState,
  requestLegacyPortfolioMigration,
  tryExplicitLegacyPortfolioMigration,
  readScopedHoldingsRaw,
  isScopedPortfolioEmpty,
};

export {
  dismissLegacyPortfolioRecovery,
  getLegacyRecoveryOffer,
  mergeLegacyPriceCacheIntoScoped,
  recoverLegacyPortfolioToUser,
  type LegacyRecoveryOffer,
} from "@/lib/client/portfolioRecovery";

export type { StoredPortfolioHolding, PortfolioInstrumentPayload };

/** Central read path for all portfolio surfaces. */
export function loadUserPortfolioHoldings(
  userSub: string,
): StoredPortfolioHolding[] {
  const holdings = applyCachedPrices(userSub, readPortfolioFromStorage(userSub));
  logHoldingDailyData(holdings, "after cache apply");
  return holdings;
}

export function isInvestmentPricePending(
  holding: StoredPortfolioHolding,
): boolean {
  if (holding.assetType === "cash") return false;
  return !Number.isFinite(holding.currentPrice) || holding.currentPrice <= 0;
}

/** Persist a holding without inferring market price from purchase price. */
export function normalizeHoldingForSave(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  if (holding.assetType === "cash") {
    return {
      ...holding,
      symbol: holding.symbol || "EUR",
      name: holding.name || "EUR Cash",
      purchasePrice: 1,
      currentPrice: 1,
    };
  }

  const purchasePrice = Number.isFinite(holding.purchasePrice)
    ? holding.purchasePrice
    : 0;
  const currentPrice =
    Number.isFinite(holding.currentPrice) && holding.currentPrice > 0
      ? holding.currentPrice
      : 0;

  return {
    ...holding,
    symbol: holding.symbol.trim().toUpperCase(),
    name: holding.name.trim(),
    purchasePrice,
    currentPrice,
    isin: holding.isin ?? null,
    exchange: holding.exchange ?? null,
    providerSymbol: holding.providerSymbol ?? null,
    instrumentName: holding.instrumentName ?? null,
    matchMethod: holding.matchMethod,
    matchConfidence: holding.matchConfidence,
    matchWarnings: holding.matchWarnings,
    requiresConfirmation: holding.requiresConfirmation,
    priceDataStatus:
      currentPrice > 0
        ? holding.priceDataStatus
        : holding.priceDataStatus ?? "unavailable",
    marketPriceUpdatedAt:
      currentPrice > 0
        ? holding.marketPriceUpdatedAt ??
          holding.updatedAt ??
          new Date().toISOString()
        : holding.marketPriceUpdatedAt,
  };
}

export type PriceRefreshResult<T extends StoredPortfolioHolding> = {
  holdings: T[];
  updated: boolean;
  message?: string;
  rateLimited?: boolean;
};

export function isRateLimitedPriceError(message: string): boolean {
  return /402|rate.?limit|daily.?limit|quota|too many requests|429|payment required/i.test(
    message,
  );
}

export function normalizePortfolioSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

/** Builds the POST /api/prices request body from stored holdings. */
export function buildPriceRequestPayload(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): PortfolioInstrumentPayload[] {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .map((holding) => {
      const savedMapping =
        userSub != null ? findSavedMappingForHolding(userSub, holding) : null;

      return {
        symbol: holding.symbol,
        name: holding.name,
        isin: holding.isin ?? savedMapping?.isin ?? null,
        exchange: holding.exchange ?? savedMapping?.exchange ?? null,
        providerSymbol:
          holding.providerSymbol ?? savedMapping?.providerSymbol ?? null,
        instrumentName:
          holding.instrumentName ?? savedMapping?.instrumentName ?? null,
      };
    });
}

/** Builds the POST /api/briefing request body from stored holdings. */
export function buildBriefingRequestPayload(
  holdings: StoredPortfolioHolding[],
): PortfolioInstrumentPayload[] {
  return buildPriceRequestPayload(holdings);
}

function quoteLookupKeys(quote: PriceApiQuote): string[] {
  return [
    normalizePortfolioSymbol(quote.symbol),
    quote.providerSymbol
      ? normalizePortfolioSymbol(quote.providerSymbol)
      : "",
    quote.eodhdSymbol
      ? normalizePortfolioSymbol(quote.eodhdSymbol)
      : "",
    quote.isin ? normalizePortfolioSymbol(quote.isin) : "",
  ].filter(Boolean);
}

/** Indexes quotes by symbol, providerSymbol, eodhdSymbol, and ISIN. */
export function buildPriceLookup(
  quotes: PriceApiQuote[] | undefined,
): Map<string, PriceApiQuote> {
  const lookup = new Map<string, PriceApiQuote>();

  for (const quote of normalizePriceApiQuotes(quotes)) {
    if (!Number.isFinite(quote.priceEur) || quote.priceEur <= 0) continue;

    for (const key of quoteLookupKeys(quote)) {
      if (!lookup.has(key)) lookup.set(key, quote);
    }
  }

  return lookup;
}

/** Coerces API/cache quote payloads into the shared normalized quote shape. */
export function normalizePriceApiQuote(raw: PriceApiQuote): PriceApiQuote {
  const priceEur =
    typeof raw.currentPrice === "number" && raw.currentPrice > 0
      ? raw.currentPrice
      : raw.priceEur;

  const normalized = normalizeMarketQuote({
    symbol: raw.symbol,
    priceEur,
    previousCloseEur: raw.previousClose ?? null,
    changeEur: raw.change ?? null,
    changePercent: raw.changePercent ?? null,
    originalCurrency: raw.currency ?? null,
    updatedAt: raw.updatedAt ?? null,
  });

  return {
    ...raw,
    priceEur: normalized.currentPrice ?? priceEur,
    currentPrice: normalized.currentPrice,
    previousClose: normalized.previousClose,
    change: normalized.change,
    changePercent: normalized.changePercent,
    currency: normalized.currency,
    updatedAt: normalized.updatedAt,
    dataStatus: raw.dataStatus ?? normalized.dataStatus,
  };
}

export function normalizePriceApiQuotes(
  quotes: PriceApiQuote[] | undefined,
): PriceApiQuote[] {
  return (quotes ?? []).map((quote) => normalizePriceApiQuote(quote));
}

function applyQuoteToHolding<T extends StoredPortfolioHolding>(
  holding: T,
  quote: PriceApiQuote,
): T {
  const normalized = normalizePriceApiQuote(quote);

  return {
    ...holding,
    currentPrice: normalized.priceEur,
    providerSymbol:
      quote.providerSymbol ?? quote.eodhdSymbol ?? holding.providerSymbol ?? null,
    previousClose:
      typeof normalized.previousClose === "number"
        ? normalized.previousClose
        : null,
    changeAmount:
      typeof normalized.change === "number" ? normalized.change : null,
    changePercent:
      typeof normalized.changePercent === "number"
        ? normalized.changePercent
        : null,
    priceDataStatus:
      (normalized.dataStatus as MarketDataStatus | undefined) ??
      holding.priceDataStatus,
    updatedAt: normalized.updatedAt ?? holding.updatedAt,
    marketPriceUpdatedAt: normalized.updatedAt ?? new Date().toISOString(),
  };
}

function clearHoldingDailyPerformance<T extends StoredPortfolioHolding>(
  holding: T,
): T {
  return {
    ...holding,
    previousClose: null,
    changeAmount: null,
    changePercent: null,
  };
}

function holdingLookupKeys(
  holding: StoredPortfolioHolding,
): string[] {
  return [
    normalizePortfolioSymbol(holding.symbol),
    holding.providerSymbol
      ? normalizePortfolioSymbol(holding.providerSymbol)
      : "",
    holding.isin ? normalizePortfolioSymbol(holding.isin) : "",
  ].filter(Boolean);
}

export function findQuoteForHolding(
  holding: StoredPortfolioHolding,
  lookup: Map<string, PriceApiQuote>,
): PriceApiQuote | undefined {
  for (const key of holdingLookupKeys(holding)) {
    const quote = lookup.get(key);
    if (quote) return quote;
  }
  return undefined;
}

export function applyPricesToHoldings<T extends StoredPortfolioHolding>(
  holdings: T[],
  quotes: PriceApiQuote[] | undefined,
  options?: { clearMissingDailyFields?: boolean },
): T[] {
  const lookup = buildPriceLookup(quotes);
  const clearMissingDailyFields = options?.clearMissingDailyFields ?? false;

  return holdings.map((holding) => {
    if (holding.assetType === "cash") return holding;

    const quote = findQuoteForHolding(holding, lookup);
    if (!quote) {
      console.warn("[holding daily data missing quote]", {
        name: holding.name,
        symbol: holding.symbol,
        providerSymbol: holding.providerSymbol,
        isin: holding.isin,
      });
      if (
        holding.providerSymbol &&
        Number.isFinite(holding.currentPrice) &&
        holding.currentPrice > 0
      ) {
        return {
          ...holding,
          priceDataStatus: "stale",
        };
      }
      return clearMissingDailyFields
        ? clearHoldingDailyPerformance(holding)
        : holding;
    }

    return applyQuoteToHolding(holding, quote);
  });
}

export function writePriceCache(
  userSub: string,
  quotes: PriceApiQuote[] | undefined,
): void {
  assertUserSub(userSub);

  const cache: CachedPortfolioPrice[] = normalizePriceApiQuotes(quotes)
    .filter((quote) => Number.isFinite(quote.priceEur) && quote.priceEur > 0)
    .map((quote) => ({
      symbol: normalizePortfolioSymbol(quote.symbol),
      providerSymbol: quote.providerSymbol ?? quote.eodhdSymbol,
      isin: quote.isin ?? null,
      price: quote.priceEur,
      previousClose:
        typeof quote.previousClose === "number" ? quote.previousClose : undefined,
      change: typeof quote.change === "number" ? quote.change : undefined,
      changePercent:
        typeof quote.changePercent === "number" ? quote.changePercent : undefined,
      currency: quote.currency ?? null,
      dataStatus: quote.dataStatus,
      updatedAt: quote.updatedAt ?? undefined,
    }));

  localStorage.setItem(priceCacheKey(userSub), JSON.stringify(cache));
}

/** Applies cached prices using the same multi-key join as live pricing. */
export function applyCachedPrices<T extends StoredPortfolioHolding>(
  userSub: string,
  holdings: T[],
): T[] {
  assertUserSub(userSub);

  try {
    const cached = localStorage.getItem(priceCacheKey(userSub));
    const parsed = cached ? (JSON.parse(cached) as CachedPortfolioPrice[]) : [];
    if (!Array.isArray(parsed)) return holdings;

    const quotes: PriceApiQuote[] = parsed
      .filter((item) => Number.isFinite(item.price) && item.price > 0)
      .map((item) =>
        normalizePriceApiQuote({
          symbol: item.symbol,
          providerSymbol: item.providerSymbol,
          isin: item.isin ?? null,
          priceEur: item.price,
          currentPrice: item.price,
          previousClose: item.previousClose ?? null,
          change: item.change ?? null,
          changePercent: item.changePercent ?? null,
          currency: item.currency ?? null,
          dataStatus: item.dataStatus,
          updatedAt: item.updatedAt ?? null,
        }),
      );

    return applyPricesToHoldings(holdings, quotes);
  } catch {
    return holdings;
  }
}

/**
 * Fetches live prices for the supplied holdings via POST /api/prices,
 * writes the user-scoped cache, and returns holdings with updated prices.
 */
export async function refreshPortfolioPrices<
  T extends StoredPortfolioHolding,
>(userSub: string, holdings: T[]): Promise<T[]> {
  assertUserSub(userSub);

  const payload = buildPriceRequestPayload(holdings, userSub);

  const response = await fetch("/api/prices", {
    method: payload.length > 0 ? "POST" : "GET",
    ...(payload.length > 0
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: payload }),
        }
      : {}),
    cache: "no-store",
  });

  const data = (await response.json()) as PriceApiResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Market data unavailable");
  }

  const normalizedQuotes = normalizePriceApiQuotes(data.prices);

  console.log("[price api coverage]", {
    requested: data.requested ?? payload.length,
    received: data.received ?? normalizedQuotes.length,
    payloadHoldings: payload.length,
  });

  if (data.errors?.length) {
    console.warn("[price api errors]", data.errors);
  }

  console.log(
    "[price api quotes]",
    normalizedQuotes.map((quote) => ({
      symbol: quote.symbol,
      providerSymbol: quote.providerSymbol ?? quote.eodhdSymbol,
      currentPrice: quote.currentPrice ?? quote.priceEur,
      previousClose: quote.previousClose,
      change: quote.change,
      changePercent: quote.changePercent,
      updatedAt: quote.updatedAt,
      dataStatus: quote.dataStatus,
    })),
  );

  writePriceCache(userSub, data.prices);
  const refreshed = applyPricesToHoldings(holdings, data.prices, {
    clearMissingDailyFields: true,
  });
  logHoldingDailyData(refreshed, "after /api/prices refresh");
  return refreshed;
}

/**
 * Best-effort price refresh that never discards holdings when quotes fail.
 */
export async function tryRefreshPortfolioPrices<
  T extends StoredPortfolioHolding,
>(userSub: string, holdings: T[]): Promise<PriceRefreshResult<T>> {
  if (holdings.length === 0) {
    return { holdings, updated: false };
  }

  try {
    const refreshed = await refreshPortfolioPrices(userSub, holdings);
    return { holdings: refreshed, updated: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market data unavailable";
    return {
      holdings,
      updated: false,
      message,
      rateLimited: isRateLimitedPriceError(message),
    };
  }
}
