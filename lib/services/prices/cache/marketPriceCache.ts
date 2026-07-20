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

export function getQuoteCacheTtlMs(providerSymbol: string, now = new Date()): number {
  if (isCryptoProviderSymbol(providerSymbol)) {
    return 7 * 60 * 1000;
  }
  return isLikelyMarketOpen(now) ? 12 * 60 * 1000 : 45 * 60 * 1000;
}

export function getNegativeCacheTtlMs(): number {
  return 20 * 60 * 1000;
}

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
  const now = Date.now();
  quoteCache.set(key, {
    quote: { ...quote, isStale: false, cacheStatus: "fresh" },
    expiresAt: now + ttlMs,
    staleUntil: now + ttlMs * 2,
  });
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
