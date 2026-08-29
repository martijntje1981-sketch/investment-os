import type {
  HoldingPrice,
  NormalizedProviderQuote,
  PriceCurrency,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import type { CryptoQuoteMetadata } from "@/lib/services/prices/cryptoQuoteTypes";

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
  if (quote.crypto && target.assetType === "crypto") {
    return convertCryptoQuoteToHoldingPrice(target, quote, quote.crypto);
  }

  const listingCurrency = quote.currency ?? target.currency;
  const exchangeRateToEur =
    listingCurrency != null &&
    typeof listingCurrency === "string" &&
    listingCurrency in fxRates
      ? fxRates[listingCurrency as PriceCurrency]
      : listingCurrency != null && typeof listingCurrency !== "string"
        ? fxRates[listingCurrency]
        : null;
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

function convertCryptoQuoteToHoldingPrice(
  target: ResolvedPriceTarget,
  quote: NormalizedProviderQuote,
  crypto: CryptoQuoteMetadata,
): HoldingPrice {
  const pairPrice = crypto.pairPrice ?? 0;
  const priceEur = quote.currentPrice ?? 0;

  return {
    symbol: target.symbol,
    eodhdSymbol: target.providerSymbol,
    providerSymbol: target.providerSymbol,
    isin: null,
    name: target.name,
    originalCurrency: crypto.quoteCurrency,
    originalPrice: pairPrice,
    baseCurrency: "EUR",
    exchangeRateToEur: null,
    priceEur,
    currentPrice: priceEur,
    pairPrice,
    previousCloseOriginal: null,
    previousCloseEur: null,
    previousClose: null,
    change: null,
    changePercent: crypto.change24hPercent,
    change24hPercent: crypto.change24hPercent,
    currency: crypto.quoteCurrency,
    dataStatus: quote.dataStatus,
    cacheStatus: quote.cacheStatus,
    provider: quote.provider,
    providerDisplayName: crypto.providerDisplayName,
    isStale: quote.isStale,
    unavailableReason: quote.unavailableReason,
    open: null,
    high: null,
    low: null,
    volume: null,
    timestamp: null,
    updatedAt: quote.updatedAt ?? new Date().toISOString(),
    fetchedAt: crypto.fetchedAt,
    assetType: "crypto",
    crypto,
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
