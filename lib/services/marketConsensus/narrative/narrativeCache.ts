import { createHash } from "node:crypto";

import type {
  MarketConsensusNarrative,
  MarketConsensusNarrativeInput,
  MarketConsensusNarrativeSource,
} from "@/lib/services/marketConsensus/narrative/types";
import { MARKET_CONSENSUS_NARRATIVE_CACHE_TTL_MS } from "@/lib/services/marketConsensus/narrative/types";

type CacheEntry = {
  narrative: MarketConsensusNarrative;
  source: MarketConsensusNarrativeSource;
  inputHash: string;
  cachedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<
  string,
  Promise<{ narrative: MarketConsensusNarrative; source: MarketConsensusNarrativeSource }>
>();

export function hashMarketConsensusNarrativeInput(
  input: MarketConsensusNarrativeInput,
): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export function resetMarketConsensusNarrativeCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

export function readMarketConsensusNarrativeCache(
  key: string,
): CacheEntry | undefined {
  return cache.get(key);
}

export function writeMarketConsensusNarrativeCache(
  key: string,
  inputHash: string,
  narrative: MarketConsensusNarrative,
  source: MarketConsensusNarrativeSource,
): void {
  cache.set(key, {
    narrative,
    source,
    inputHash,
    cachedAt: Date.now(),
  });
}

function isExpired(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.cachedAt >= MARKET_CONSENSUS_NARRATIVE_CACHE_TTL_MS;
}

export async function getCachedMarketConsensusNarrative(
  key: string,
  inputHash: string,
  fetcher: () => Promise<{
    narrative: MarketConsensusNarrative;
    source: MarketConsensusNarrativeSource;
  }>,
): Promise<{ narrative: MarketConsensusNarrative; source: MarketConsensusNarrativeSource }> {
  const existing = cache.get(key);
  if (existing && existing.inputHash === inputHash && !isExpired(existing)) {
    return { narrative: existing.narrative, source: existing.source };
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const result = await fetcher();
      writeMarketConsensusNarrativeCache(
        key,
        inputHash,
        result.narrative,
        result.source,
      );
      return result;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

export function getMarketConsensusNarrativeInFlightCount(): number {
  return inFlight.size;
}
