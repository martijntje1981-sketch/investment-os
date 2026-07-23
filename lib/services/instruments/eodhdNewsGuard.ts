/**
 * Session-scoped guard for EODHD news API calls.
 * Uses a dedicated circuit breaker — independent from live quote pricing.
 */

import {
  EODHD_API_PROVIDER_ID,
  getEodhdDailyBudgetBlockReason,
} from "@/lib/services/marketData/eodhdDailyQuota";
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
  recordProviderCircuitFailure(
    EODHD_API_PROVIDER_ID,
    error instanceof Error
      ? error
      : new Error("EODHD news API returned quota or rate limit"),
  );
}

export function isEodhdNewsQuotaExhausted(): boolean {
  return (
    isProviderCircuitOpen(EODHD_NEWS_PROVIDER_ID) ||
    isProviderCircuitOpen(EODHD_API_PROVIDER_ID)
  );
}

export function isEodhdNewsFetchBlocked(): boolean {
  return isEodhdNewsQuotaExhausted();
}

export function getEodhdNewsBlockReason(): string | null {
  return (
    getEodhdDailyBudgetBlockReason() ??
    getProviderCircuitReason(EODHD_API_PROVIDER_ID) ??
    getProviderCircuitReason(EODHD_NEWS_PROVIDER_ID)
  );
}

export function assertEodhdNewsAvailable(): void {
  if (isProviderCircuitOpen(EODHD_API_PROVIDER_ID)) {
    assertProviderAvailable(EODHD_API_PROVIDER_ID);
  }
  assertProviderAvailable(EODHD_NEWS_PROVIDER_ID);
}

/** Test-only reset. */
export function resetEodhdNewsGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_NEWS_PROVIDER_ID);
}
