/**
 * Session-scoped guard to avoid repeated EODHD calls after quota exhaustion (402/429).
 * Delegates to the shared provider-wide circuit breaker.
 */

import {
  assertProviderAvailable,
  getProviderCircuitReason,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";

export const EODHD_PROVIDER_ID = "eodhd";

export function markEodhdQuotaExhausted(): void {
  recordProviderCircuitFailure(
    EODHD_PROVIDER_ID,
    new Error("EODHD id-mapping returned 402: quota exhausted"),
  );
}

export function isEodhdQuotaExhausted(): boolean {
  return isProviderCircuitOpen(EODHD_PROVIDER_ID);
}

export function getEodhdQuotaBlockReason(): string | null {
  return getProviderCircuitReason(EODHD_PROVIDER_ID);
}

export function assertEodhdAvailable(): void {
  assertProviderAvailable(EODHD_PROVIDER_ID);
}

/** Test-only reset. */
export function resetEodhdQuotaGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_PROVIDER_ID);
}
