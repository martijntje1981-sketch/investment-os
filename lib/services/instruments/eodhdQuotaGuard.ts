/**
 * Session-scoped guard to avoid repeated EODHD calls after quota exhaustion (402/429).
 */

let sessionQuotaExhausted = false;

export function markEodhdQuotaExhausted(): void {
  sessionQuotaExhausted = true;
}

export function isEodhdQuotaExhausted(): boolean {
  return sessionQuotaExhausted;
}

/** Test-only reset. */
export function resetEodhdQuotaGuardForTests(): void {
  sessionQuotaExhausted = false;
}
