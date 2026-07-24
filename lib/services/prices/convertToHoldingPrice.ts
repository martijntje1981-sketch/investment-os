import type {
  HoldingPrice,
  NormalizedProviderQuote,
  PriceCurrency,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";

export function convertQuoteToHoldingPrice(
  target: ResolvedPriceTarget,
  quote: NormalizedProviderQuote,
  fxRates: Record<PriceCurrency, number | null>,
  raw?: {
    originalPrice?: number;
    previousCloseOriginal?: number | null;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    volume?: number | null;
    timestamp?: number | null;
  },
): HoldingPrice {
  const listingCurrency = quote.currency ?? target.currency;
  const exchangeRateToEur =
    listingCurrency != null ? fxRates[listingCurrency] : null;
  const originalPrice =
    raw?.originalPrice ??
    (quote.currentPrice !== null &&
    listingCurrency != null &&
    exchangeRateToEur != null
      ? quote.currentPrice / exchangeRateToEur
      : 0);

  return {
    symbol: target.symbol,
    eodhdSymbol: target.providerSymbol,
    providerSymbol: target.providerSymbol,
    isin: target.isin,
    name: target.name,
    originalCurrency: listingCurrency ?? "EUR",
    originalPrice,
    baseCurrency: "EUR",
    exchangeRateToEur,
    priceEur: quote.currentPrice ?? 0,
    currentPrice: quote.currentPrice,
    previousCloseOriginal: raw?.previousCloseOriginal ?? null,
    previousCloseEur: quote.previousClose,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency,
    dataStatus: quote.dataStatus,
    cacheStatus: quote.cacheStatus,
    provider: quote.provider,
    isStale: quote.isStale,
    unavailableReason: quote.unavailableReason,
    open: raw?.open ?? null,
    high: raw?.high ?? null,
    low: raw?.low ?? null,
    volume: raw?.volume ?? null,
    timestamp: raw?.timestamp ?? null,
    updatedAt: quote.updatedAt ?? new Date().toISOString(),
  };
}

export function buildUnavailableQuote(
  target: ResolvedPriceTarget,
  providerId: string,
  reason: string,
): NormalizedProviderQuote {
  return {
    symbol: target.symbol,
    providerSymbol: target.providerSymbol,
    currentPrice: null,
    previousClose: null,
    change: null,
    changePercent: null,
    currency: target.currency,
    marketStatus: null,
    updatedAt: null,
    provider: providerId,
    isStale: false,
    unavailableReason: reason,
    dataStatus: "unavailable",
    cacheStatus: "unavailable",
  };
}
