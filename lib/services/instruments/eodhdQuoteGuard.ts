/**
 * Session-scoped guard for EODHD quote / FX calls (price refresh).
 * Separate from instrument lookup so quote rate limits do not block matching.
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

export const EODHD_QUOTE_PROVIDER_ID = "eodhd-quotes";

export function markEodhdQuoteQuotaExhausted(error?: unknown): void {
  recordProviderCircuitFailure(
    EODHD_QUOTE_PROVIDER_ID,
    error instanceof Error
      ? error
      : new Error("EODHD quote API returned quota or rate limit"),
  );
  recordProviderCircuitFailure(
    EODHD_API_PROVIDER_ID,
    error instanceof Error
      ? error
      : new Error("EODHD quote API returned quota or rate limit"),
  );
}

export function isEodhdQuoteQuotaExhausted(): boolean {
  return (
    isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID) ||
    isProviderCircuitOpen(EODHD_API_PROVIDER_ID)
  );
}

export function getEodhdQuoteBlockReason(): string | null {
  return (
    getEodhdDailyBudgetBlockReason() ??
    getProviderCircuitReason(EODHD_API_PROVIDER_ID) ??
    getProviderCircuitReason(EODHD_QUOTE_PROVIDER_ID)
  );
}

export function assertEodhdQuoteAvailable(): void {
  if (isProviderCircuitOpen(EODHD_API_PROVIDER_ID)) {
    assertProviderAvailable(EODHD_API_PROVIDER_ID);
  }
  assertProviderAvailable(EODHD_QUOTE_PROVIDER_ID);
}

/** Test-only reset. */
export function resetEodhdQuoteGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_QUOTE_PROVIDER_ID);
}
