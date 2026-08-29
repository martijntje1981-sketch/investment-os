import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";
import { MARKET_CONSENSUS_CACHE_TTL_MS } from "@/lib/services/marketConsensus/types";

type CacheEntry = {
  result: AnalystConsensusResult;
  cachedAt: number;
  ttlMs: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AnalystConsensusResult>>();

export function resolveConsensusCacheTtlMs(
  result: AnalystConsensusResult,
): number {
  if (result.availability === "error") {
    return MARKET_CONSENSUS_CACHE_TTL_MS.error;
  }

  if (result.availability === "available") {
    return MARKET_CONSENSUS_CACHE_TTL_MS.available;
  }

  return MARKET_CONSENSUS_CACHE_TTL_MS.unavailable;
}

function isExpired(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.cachedAt >= entry.ttlMs;
}

export function resetMarketConsensusCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

export function readMarketConsensusCacheEntry(
  key: string,
): CacheEntry | undefined {
  return cache.get(key);
}

export function writeMarketConsensusCacheEntry(
  key: string,
  result: AnalystConsensusResult,
): void {
  cache.set(key, {
    result,
    cachedAt: Date.now(),
    ttlMs: resolveConsensusCacheTtlMs(result),
  });
}

export async function getCachedMarketConsensus(
  key: string,
  fetcher: () => Promise<AnalystConsensusResult>,
): Promise<AnalystConsensusResult> {
  const existing = cache.get(key);
  if (existing && !isExpired(existing)) {
    return existing.result;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const result = await fetcher();
      writeMarketConsensusCacheEntry(key, result);
      return result;
    } catch (error) {
      if (existing) {
        return {
          ...existing.result,
          isStale: true,
          availability:
            existing.result.availability === "available"
              ? "limited"
              : existing.result.availability,
          errorCode: "provider_fetch_failed",
        };
      }

      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

export function expireMarketConsensusCacheEntryForTests(key: string): void {
  const entry = cache.get(key);
  if (!entry) {
    return;
  }

  cache.set(key, {
    ...entry,
    cachedAt: Date.now() - entry.ttlMs - 1,
  });
}
