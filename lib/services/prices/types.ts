import type { MarketDataStatus } from "@/lib/services/prices/marketQuote";

export type PriceCurrency = "EUR" | "USD" | "GBP" | "CHF";

export type CacheStatus = "fresh" | "stale" | "unavailable";

export type ProviderFailureKind =
  | "quota_exhausted"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_symbol"
  | "incomplete_quote";

export type PriceHoldingInput = {
  id?: string;
  symbol: string;
  name?: string;
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  currency?: PriceCurrency;
};

export type ResolvedPriceTarget = {
  symbol: string;
  providerSymbol: string;
  isin: string | null;
  name: string;
  currency: PriceCurrency;
};

export type ProviderRawQuote = {
  providerSymbol: string;
  originalCurrency: PriceCurrency;
  originalPrice: number;
  previousCloseOriginal: number | null;
  changeOriginal: number | null;
  changePercentOriginal: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: number | null;
  updatedAt: string;
  marketStatus?: string | null;
};

export type NormalizedProviderQuote = {
  symbol: string;
  providerSymbol: string;
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: PriceCurrency | null;
  marketStatus: string | null;
  updatedAt: string | null;
  provider: string;
  isStale: boolean;
  unavailableReason: string | null;
  dataStatus: MarketDataStatus;
  cacheStatus: CacheStatus;
};

export type HoldingPrice = {
  symbol: string;
  eodhdSymbol: string;
  providerSymbol: string;
  isin: string | null;
  name: string;
  originalCurrency: PriceCurrency;
  originalPrice: number;
  baseCurrency: "EUR";
  exchangeRateToEur: number | null;
  priceEur: number;
  currentPrice: number | null;
  previousCloseOriginal: number | null;
  previousCloseEur: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: PriceCurrency | null;
  dataStatus: MarketDataStatus;
  cacheStatus: CacheStatus;
  provider: string;
  isStale: boolean;
  unavailableReason: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: number | null;
  updatedAt: string;
};

export const NO_QUOTABLE_HOLDINGS_MESSAGE =
  "No holdings available for live pricing.";

export type PricePayload = {
  success: boolean;
  message?: string;
  baseCurrency: "EUR";
  fxRates: {
    EUR: number | null;
    USD_TO_EUR: number | null;
    GBP_TO_EUR: number | null;
    CHF_TO_EUR: number | null;
  };
  prices: HoldingPrice[];
  errors: string[];
  requested: number;
  received: number;
  generatedAt: string;
  cache: {
    enabled: true;
    durationSeconds: number;
  };
  metrics?: PriceServiceMetricsSnapshot;
};

export type PriceServiceMetricsSnapshot = {
  cacheHits: number;
  cacheMisses: number;
  deduplicatedRequests: number;
  providerCalls: number;
  providerFailures: number;
  quotaFailures: number;
  providerCooldowns: number;
  mappingCallsPrevented: number;
  events: Partial<
    Record<
      | "cache_hit"
      | "cache_stale"
      | "fresh_fetch"
      | "deduplicated"
      | "provider_cooldown"
      | "provider_error"
      | "stale_fallback",
      number
    >
  >;
};

export type MarketDataProvider = {
  id: string;
  supports: (providerSymbol: string) => boolean;
  getQuote: (providerSymbol: string) => Promise<ProviderRawQuote>;
  getQuotes?: (
    providerSymbols: string[],
  ) => Promise<Map<string, ProviderRawQuote>>;
  normalizeQuote: (
    target: ResolvedPriceTarget,
    raw: ProviderRawQuote,
    fxRates: Record<PriceCurrency, number | null>,
  ) => NormalizedProviderQuote;
};

