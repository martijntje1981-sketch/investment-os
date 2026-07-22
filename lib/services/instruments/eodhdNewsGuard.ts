/**
 * Session-scoped guard for EODHD news API calls.
 * Shares quota with quote/instrument APIs — respects quote circuit when open.
 */

import {
  assertProviderAvailable,
  getProviderCircuitReason,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";

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
  return (
    isProviderCircuitOpen(EODHD_NEWS_PROVIDER_ID) ||
    isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID)
  );
}

export function getEodhdNewsBlockReason(): string | null {
  return (
    getProviderCircuitReason(EODHD_NEWS_PROVIDER_ID) ??
    getProviderCircuitReason(EODHD_QUOTE_PROVIDER_ID)
  );
}

export function assertEodhdNewsAvailable(): void {
  assertProviderAvailable(EODHD_NEWS_PROVIDER_ID);
}

/** Test-only reset. */
export function resetEodhdNewsGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_NEWS_PROVIDER_ID);
}
