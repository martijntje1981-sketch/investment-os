import type { PriceServiceMetricsSnapshot } from "@/lib/services/prices/types";

const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  deduplicatedRequests: 0,
  providerCalls: 0,
  providerFailures: 0,
  quotaFailures: 0,
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

export function getPriceServiceMetricsSnapshot(): PriceServiceMetricsSnapshot {
  return { ...metrics };
}

export function resetPriceServiceMetricsForTests(): void {
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.deduplicatedRequests = 0;
  metrics.providerCalls = 0;
  metrics.providerFailures = 0;
  metrics.quotaFailures = 0;
}

export function logPriceServiceMetrics(context: string): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const snapshot = getPriceServiceMetricsSnapshot();
  console.info(`[price-service] ${context}`, snapshot);
}
