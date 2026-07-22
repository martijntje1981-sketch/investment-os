/**
 * Session-scoped guard for EODHD instrument search / id-mapping calls.
 * Separate from quote refresh — quote rate limits must not block matching.
 */

import {
  assertProviderAvailable,
  getProviderCircuitReason,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";

export const EODHD_INSTRUMENT_PROVIDER_ID = "eodhd-instruments";

/** @deprecated Use EODHD_INSTRUMENT_PROVIDER_ID — kept for instrument API client code. */
export const EODHD_PROVIDER_ID = EODHD_INSTRUMENT_PROVIDER_ID;

export function markEodhdInstrumentQuotaExhausted(error?: unknown): void {
  recordProviderCircuitFailure(
    EODHD_INSTRUMENT_PROVIDER_ID,
    error instanceof Error
      ? error
      : new Error("EODHD instrument API returned quota or rate limit"),
  );
}

/** @deprecated Use markEodhdInstrumentQuotaExhausted */
export function markEodhdQuotaExhausted(error?: unknown): void {
  markEodhdInstrumentQuotaExhausted(error);
}

export function isEodhdInstrumentQuotaExhausted(): boolean {
  return isProviderCircuitOpen(EODHD_INSTRUMENT_PROVIDER_ID);
}

/** @deprecated Use isEodhdInstrumentQuotaExhausted */
export function isEodhdQuotaExhausted(): boolean {
  return isEodhdInstrumentQuotaExhausted();
}

export function getEodhdInstrumentBlockReason(): string | null {
  return getProviderCircuitReason(EODHD_INSTRUMENT_PROVIDER_ID);
}

/** @deprecated Use getEodhdInstrumentBlockReason */
export function getEodhdQuotaBlockReason(): string | null {
  return getEodhdInstrumentBlockReason();
}

export function assertEodhdInstrumentAvailable(): void {
  assertProviderAvailable(EODHD_INSTRUMENT_PROVIDER_ID);
}

/** @deprecated Use assertEodhdInstrumentAvailable */
export function assertEodhdAvailable(): void {
  assertEodhdInstrumentAvailable();
}

/** Test-only reset. */
export function resetEodhdInstrumentGuardForTests(): void {
  resetProviderCircuitForTests(EODHD_INSTRUMENT_PROVIDER_ID);
}

/** @deprecated Use resetEodhdInstrumentGuardForTests */
export function resetEodhdQuotaGuardForTests(): void {
  resetEodhdInstrumentGuardForTests();
}
