import type { NormalizedProviderQuote } from "@/lib/services/prices/types";

type CacheEntry = {
  quote: NormalizedProviderQuote;
  expiresAt: number;
  staleUntil: number;
};

type NegativeEntry = {
  reason: string;
  until: number;
};

const quoteCache = new Map<string, CacheEntry>();
const negativeCache = new Map<string, NegativeEntry>();
const inFlight = new Map<string, Promise<NormalizedProviderQuote>>();

export function buildQuoteCacheKey(
  providerId: string,
  providerSymbol: string,
): string {
  return `${providerId}:${providerSymbol.trim().toUpperCase()}`;
}

import {
  getQuoteFreshTtlMs,
  getQuoteStaleWindowMs,
  isCryptoProviderSymbol,
  isLikelyMarketOpen,
} from "@/lib/services/marketData/cachePolicy";

export function getQuoteCacheTtlMs(providerSymbol: string, now = new Date()): number {
  return getQuoteFreshTtlMs(providerSymbol, undefined, now);
}

function getQuoteStaleTtlMs(providerSymbol: string, now = new Date()): number {
  return getQuoteStaleWindowMs(providerSymbol, undefined, now);
}

export { isCryptoProviderSymbol, isLikelyMarketOpen };

export function readCachedQuote(key: string): {
  quote: NormalizedProviderQuote;
  fresh: boolean;
} | null {
  const entry = quoteCache.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.staleUntil) {
    quoteCache.delete(key);
    return null;
  }

  const fresh = now <= entry.expiresAt;
  return {
    quote: {
      ...entry.quote,
      isStale: !fresh,
      cacheStatus: fresh ? "fresh" : "stale",
      dataStatus: fresh ? entry.quote.dataStatus : "stale",
    },
    fresh,
  };
}

export function writeCachedQuote(
  key: string,
  quote: NormalizedProviderQuote,
  providerSymbol: string,
): void {
  const ttlMs = getQuoteCacheTtlMs(providerSymbol);
  const staleMs = getQuoteStaleTtlMs(providerSymbol);
  const now = Date.now();
  quoteCache.set(key, {
    quote: { ...quote, isStale: false, cacheStatus: "fresh" },
    expiresAt: now + ttlMs,
    staleUntil: now + staleMs,
  });
}

export function getNegativeCacheTtlMs(): number {
  return 20 * 60 * 1000;
}

export function readNegativeCache(key: string): string | null {
  const entry = negativeCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.until) {
    negativeCache.delete(key);
    return null;
  }
  return entry.reason;
}

export function writeNegativeCache(key: string, reason: string): void {
  negativeCache.set(key, {
    reason,
    until: Date.now() + getNegativeCacheTtlMs(),
  });
}

export function clearNegativeCache(key: string): void {
  negativeCache.delete(key);
}

export function getInFlightQuote(
  key: string,
): Promise<NormalizedProviderQuote> | null {
  return inFlight.get(key) ?? null;
}

export function setInFlightQuote(
  key: string,
  promise: Promise<NormalizedProviderQuote>,
): void {
  inFlight.set(key, promise);
  void promise.catch(() => undefined).finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
}

export function resetMarketPriceCacheForTests(): void {
  quoteCache.clear();
  negativeCache.clear();
  inFlight.clear();
}
