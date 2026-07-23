/**
 * Session-scoped guard for EODHD news API calls.
 * Uses a dedicated circuit breaker — independent from live quote pricing.
 */

import {
  assertProviderAvailable,
  getProviderCircuitReason,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";

export const EODHD_NEWS_PROVIDER_ID = "eodhd-news";

export function markEodhdNewsQuotaExhausted(error?: unknown): void {
  recordProviderCircuitFailure(
    EODHD_NEWS_PROVIDER_ID,
    error instanceof Error
      ? error
      : new Error("EODHD news API returned quota or rate limit"),
  );
}

export function isEodhdNewsQuotaExhausted(): boolean {
  return isProviderCircuitOpen(EODHD_NEWS_PROVIDER_ID);
}

export function isEodhdNewsFetchBlocked(): boolean {
  return isProviderCircuitOpen(EODHD_NEWS_PROVIDER_ID);
}

export function getEodhdNewsBlockReason(): string | null {
  return getProviderCircuitReason(EODHD_NEWS_PROVIDER_ID);
}

export function assertEodhdNewsAvailable(): void {
  assertProviderAvailable(EODHD_NEWS_PROVIDER_ID);
}

/** Test-only reset. */
export function resetEodhdNewsGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_NEWS_PROVIDER_ID);
}
