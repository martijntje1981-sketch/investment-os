/**
 * Shared official-rates snapshot with process-global cache.
 * Policy rates do not depend on market hours.
 */

import { CASH_BENCHMARK_CACHE_TTL_MS, CASH_BENCHMARK_STALE_TTL_MS } from "@/lib/services/cashIntelligence/benchmarkConfig";
import { fetchEcbOfficialRates } from "@/lib/services/officialRates/providers/ecbOfficialRates";
import { fetchNyFedOfficialRates } from "@/lib/services/officialRates/providers/nyFedOfficialRates";
import type {
  OfficialRatesSnapshot,
  RateObservation,
} from "@/lib/services/officialRates/types";

type CacheEntry = {
  snapshot: OfficialRatesSnapshot;
  storedAt: number;
};

let memoryCache: CacheEntry | null = null;

function groupRates(rates: RateObservation[]): OfficialRatesSnapshot["groups"] {
  const euro = rates.filter((rate) => rate.region === "euro_area");
  const us = rates.filter((rate) => rate.region === "united_states");
  const groups: OfficialRatesSnapshot["groups"] = [
    { id: "euro_area", label: "Euro area", rates: euro },
    { id: "united_states", label: "United States", rates: us },
  ];
  return groups.filter((group) => group.rates.length > 0);
}

function emptySnapshot(now: number, errors: string[]): OfficialRatesSnapshot {
  return {
    fetchedAt: new Date(now).toISOString(),
    cacheExpiresAt: new Date(now + CASH_BENCHMARK_CACHE_TTL_MS).toISOString(),
    isStale: false,
    groups: [],
    providerErrors: errors,
  };
}

export async function fetchOfficialRates(options?: {
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<OfficialRatesSnapshot> {
  const now = options?.now ?? Date.now();
  const fetchImpl = options?.fetchImpl ?? fetch;

  if (
    !options?.forceRefresh &&
    memoryCache &&
    now - memoryCache.storedAt < CASH_BENCHMARK_CACHE_TTL_MS
  ) {
    return { ...memoryCache.snapshot, isStale: false };
  }

  try {
    const [ecb, nyFed] = await Promise.all([
      fetchEcbOfficialRates(fetchImpl, now),
      fetchNyFedOfficialRates(fetchImpl, now),
    ]);

    const snapshot: OfficialRatesSnapshot = {
      fetchedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + CASH_BENCHMARK_CACHE_TTL_MS).toISOString(),
      isStale: false,
      groups: groupRates([...ecb.rates, ...nyFed.rates]),
      providerErrors: [...ecb.errors, ...nyFed.errors],
    };

    if (snapshot.groups.length > 0) {
      memoryCache = { snapshot, storedAt: now };
      return snapshot;
    }

    if (
      memoryCache &&
      now - memoryCache.storedAt < CASH_BENCHMARK_STALE_TTL_MS
    ) {
      return {
        ...memoryCache.snapshot,
        isStale: true,
        providerErrors: [
          ...memoryCache.snapshot.providerErrors,
          ...snapshot.providerErrors,
        ],
      };
    }

    return snapshot;
  } catch (error) {
    if (
      memoryCache &&
      now - memoryCache.storedAt < CASH_BENCHMARK_STALE_TTL_MS
    ) {
      return {
        ...memoryCache.snapshot,
        isStale: true,
        providerErrors: [
          ...memoryCache.snapshot.providerErrors,
          error instanceof Error ? error.message : "Official rates refresh failed",
        ],
      };
    }

    return emptySnapshot(now, [
      error instanceof Error ? error.message : "Official rates unavailable",
    ]);
  }
}

export function resetOfficialRatesCacheForTests(): void {
  memoryCache = null;
}

export function seedOfficialRatesCacheForTests(
  snapshot: OfficialRatesSnapshot,
  storedAt = Date.now(),
): void {
  memoryCache = { snapshot, storedAt };
}
