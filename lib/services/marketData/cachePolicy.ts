/**
 * Central market-data cache freshness rules.
 * All TTL decisions for quotes, FX, and instrument lookups flow through here.
 */

export type QuoteAssetClass = "equity" | "crypto" | "fx";

export type MarketDataCachePolicy = {
  quoteFreshMs: {
    equityMarketHours: number;
    equityOffHours: number;
    crypto: number;
  };
  quoteStaleWindowMs: {
    equityMarketHours: number;
    equityOffHours: number;
    crypto: number;
  };
  fxFreshMs: number;
  instrumentMappingFreshMs: number;
  providerCooldownMs: {
    quotaExceeded: number;
    rateLimitedDefault: number;
    temporaryErrorBase: number;
    temporaryErrorMax: number;
  };
};

export const DEFAULT_MARKET_DATA_CACHE_POLICY: MarketDataCachePolicy = {
  quoteFreshMs: {
    equityMarketHours: 30 * 60 * 1000,
    equityOffHours: 6 * 60 * 60 * 1000,
    crypto: 15 * 60 * 1000,
  },
  quoteStaleWindowMs: {
    equityMarketHours: 60 * 60 * 1000,
    equityOffHours: 24 * 60 * 60 * 1000,
    crypto: 30 * 60 * 1000,
  },
  fxFreshMs: 60 * 60 * 1000,
  instrumentMappingFreshMs: 30 * 24 * 60 * 60 * 1000,
  providerCooldownMs: {
    quotaExceeded: 6 * 60 * 60 * 1000,
    rateLimitedDefault: 15 * 60 * 1000,
    temporaryErrorBase: 60 * 1000,
    temporaryErrorMax: 15 * 60 * 1000,
  },
};

/** Client-side guard before calling POST /api/prices on navigation. */
export const CLIENT_PRICE_CACHE_FRESH_MS = 30 * 60 * 1000;

export function isCryptoProviderSymbol(providerSymbol: string): boolean {
  const exchange = providerSymbol.split(".").pop()?.toUpperCase() ?? "";
  return exchange === "CC" || exchange === "CRYPTO";
}

export function isLikelyMarketOpen(now = new Date()): boolean {
  const utcHour = now.getUTCHours();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) {
    return false;
  }
  return utcHour >= 8 && utcHour <= 22;
}

export function classifyQuoteAsset(providerSymbol: string): QuoteAssetClass {
  if (isCryptoProviderSymbol(providerSymbol)) {
    return "crypto";
  }
  if (providerSymbol.includes(".FOREX") || providerSymbol.endsWith(".FOREX")) {
    return "fx";
  }
  return "equity";
}

export function getQuoteFreshTtlMs(
  providerSymbol: string,
  policy: MarketDataCachePolicy = DEFAULT_MARKET_DATA_CACHE_POLICY,
  now = new Date(),
): number {
  const assetClass = classifyQuoteAsset(providerSymbol);
  if (assetClass === "crypto") {
    return policy.quoteFreshMs.crypto;
  }
  return isLikelyMarketOpen(now)
    ? policy.quoteFreshMs.equityMarketHours
    : policy.quoteFreshMs.equityOffHours;
}

export function getQuoteStaleWindowMs(
  providerSymbol: string,
  policy: MarketDataCachePolicy = DEFAULT_MARKET_DATA_CACHE_POLICY,
  now = new Date(),
): number {
  const assetClass = classifyQuoteAsset(providerSymbol);
  if (assetClass === "crypto") {
    return policy.quoteStaleWindowMs.crypto;
  }
  return isLikelyMarketOpen(now)
    ? policy.quoteStaleWindowMs.equityMarketHours
    : policy.quoteStaleWindowMs.equityOffHours;
}
