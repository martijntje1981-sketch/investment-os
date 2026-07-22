import type { PriceServiceMetricsSnapshot } from "@/lib/services/prices/types";

export type PriceServiceEventSource =
  | "cache_hit"
  | "cache_stale"
  | "fresh_fetch"
  | "deduplicated"
  | "provider_cooldown"
  | "provider_error"
  | "stale_fallback";

const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  deduplicatedRequests: 0,
  providerCalls: 0,
  providerFailures: 0,
  quotaFailures: 0,
  providerCooldowns: 0,
  mappingCallsPrevented: 0,
  events: {} as Record<PriceServiceEventSource, number>,
};

export function recordPriceCacheHit(): void {
  metrics.cacheHits += 1;
}

export function recordPriceCacheMiss(): void {
  metrics.cacheMisses += 1;
}

export function recordPriceDedup(): void {
  metrics.deduplicatedRequests += 1;
}

export function recordProviderCall(): void {
  metrics.providerCalls += 1;
}

export function recordProviderFailure(quota = false): void {
  metrics.providerFailures += 1;
  if (quota) {
    metrics.quotaFailures += 1;
  }
}

export function recordProviderCooldown(providerId: string): void {
  metrics.providerCooldowns += 1;
  if (process.env.NODE_ENV !== "production") {
    console.info("[price-service] provider_cooldown", { providerId });
  }
}

export function recordMappingCallPrevented(): void {
  metrics.mappingCallsPrevented += 1;
}

export function recordPriceServiceEvent(
  source: PriceServiceEventSource,
  detail?: { providerId?: string; providerSymbol?: string },
): void {
  metrics.events[source] = (metrics.events[source] ?? 0) + 1;

  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[price-service]", {
    source,
    providerId: detail?.providerId,
    providerSymbol: detail?.providerSymbol,
  });
}

export function getPriceServiceMetricsSnapshot(): PriceServiceMetricsSnapshot {
  return {
    ...metrics,
    events: { ...metrics.events },
  };
}

export function resetPriceServiceMetricsForTests(): void {
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.deduplicatedRequests = 0;
  metrics.providerCalls = 0;
  metrics.providerFailures = 0;
  metrics.quotaFailures = 0;
  metrics.providerCooldowns = 0;
  metrics.mappingCallsPrevented = 0;
  metrics.events = {} as Record<PriceServiceEventSource, number>;
}

export function logPriceServiceMetrics(context: string): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const snapshot = getPriceServiceMetricsSnapshot();
  console.info(`[price-service] ${context}`, snapshot);
}

export type PriceRefreshLogSummary = {
  holdingsRequested: number;
  holdingsSkipped: number;
  holdingsQuotable: number;
  providerCallsMade: number;
  cacheHits: number;
  cacheMisses: number;
};

export function logPriceRefreshSummary(summary: PriceRefreshLogSummary): void {
  console.info("[price-service] refresh_summary", summary);
}
