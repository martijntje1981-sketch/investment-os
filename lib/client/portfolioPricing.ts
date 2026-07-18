/**
 * Shared client-side portfolio pricing pipeline.
 *
 * Used by portfolio, dashboard, and detail pages so every surface resolves
 * live prices through the same POST /api/prices + providerSymbol join logic.
 */

import {
  PORTFOLIO_STORAGE_KEY,
  PRICE_CACHE_KEY,
  type CachedPortfolioPrice,
  type PortfolioInstrumentPayload,
  type PriceApiQuote,
  type PriceApiResponse,
  type StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

export {
  PORTFOLIO_STORAGE_KEY,
  PRICE_CACHE_KEY,
} from "@/lib/types/portfolioStorage";

export type { StoredPortfolioHolding, PortfolioInstrumentPayload };

export function normalizePortfolioSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

/** Reads holdings from localStorage, preserving extended instrument fields. */
export function readPortfolioFromStorage(): StoredPortfolioHolding[] {
  try {
    const stored = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        ...(item as StoredPortfolioHolding),
        symbol: normalizePortfolioSymbol(
          (item as StoredPortfolioHolding).symbol,
        ),
        assetType:
          (item as StoredPortfolioHolding).assetType === "cash"
            ? "cash"
            : "investment",
      }));
  } catch {
    return [];
  }
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
    };
  });
}

export function writePriceCache(quotes: PriceApiQuote[] | undefined): void {
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

  localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
}

/** Applies cached prices using the same multi-key join as live pricing. */
export function applyCachedPrices<T extends StoredPortfolioHolding>(
  holdings: T[],
): T[] {
  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
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
 * writes the shared cache, and returns holdings with updated prices.
 */
export async function refreshPortfolioPrices<
  T extends StoredPortfolioHolding,
>(holdings: T[]): Promise<T[]> {
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

  writePriceCache(data.prices);
  return applyPricesToHoldings(holdings, data.prices);
}
