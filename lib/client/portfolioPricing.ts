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
  return applyCachedPrices(userSub, readPortfolioFromStorage(userSub));
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
  return /rate.?limit|daily.?limit|quota|too many requests|429/i.test(message);
}

export function normalizePortfolioSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

/** Builds the POST /api/prices request body from stored holdings. */
export function buildPriceRequestPayload(
  holdings: StoredPortfolioHolding[],
): PortfolioInstrumentPayload[] {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      isin: holding.isin ?? null,
      exchange: holding.exchange ?? null,
      providerSymbol: holding.providerSymbol ?? null,
      instrumentName: holding.instrumentName ?? null,
    }));
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

  for (const quote of quotes ?? []) {
    if (!Number.isFinite(quote.priceEur) || quote.priceEur <= 0) continue;

    for (const key of quoteLookupKeys(quote)) {
      if (!lookup.has(key)) lookup.set(key, quote);
    }
  }

  return lookup;
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
): T[] {
  const lookup = buildPriceLookup(quotes);

  return holdings.map((holding) => {
    if (holding.assetType === "cash") return holding;

    const quote = findQuoteForHolding(holding, lookup);
    if (!quote) return holding;

    return {
      ...holding,
      currentPrice: quote.priceEur,
      changePercent:
        typeof quote.changePercent === "number"
          ? quote.changePercent
          : holding.changePercent,
      updatedAt: quote.updatedAt ?? holding.updatedAt,
      marketPriceUpdatedAt: quote.updatedAt ?? new Date().toISOString(),
    };
  });
}

export function writePriceCache(
  userSub: string,
  quotes: PriceApiQuote[] | undefined,
): void {
  assertUserSub(userSub);

  const cache: CachedPortfolioPrice[] = (quotes ?? [])
    .filter((quote) => Number.isFinite(quote.priceEur) && quote.priceEur > 0)
    .map((quote) => ({
      symbol: normalizePortfolioSymbol(quote.symbol),
      providerSymbol: quote.providerSymbol ?? quote.eodhdSymbol,
      isin: quote.isin ?? null,
      price: quote.priceEur,
      changePercent:
        typeof quote.changePercent === "number"
          ? quote.changePercent
          : undefined,
      updatedAt: quote.updatedAt,
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
      .map((item) => ({
        symbol: item.symbol,
        providerSymbol: item.providerSymbol,
        isin: item.isin ?? null,
        priceEur: item.price,
        changePercent: item.changePercent ?? null,
        updatedAt: item.updatedAt,
      }));

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

  const payload = buildPriceRequestPayload(holdings);

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

  writePriceCache(userSub, data.prices);
  return applyPricesToHoldings(holdings, data.prices);
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
