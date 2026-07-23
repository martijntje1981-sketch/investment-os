/**
 * Provider-wide circuit breaker shared by quote retrieval and instrument matching.
 * Prevents hammering EODHD after quota/rate-limit failures.
 */

import {
  DEFAULT_MARKET_DATA_CACHE_POLICY,
  type MarketDataCachePolicy,
} from "@/lib/services/marketData/cachePolicy";
import {
  isProviderQuotaOrRateLimit,
  isProviderUnavailable,
  normalizeProviderError,
  type NormalizedProviderError,
} from "@/lib/services/marketData/providerErrors";

type ProviderState = {
  openUntil: number;
  reason: NormalizedProviderError["kind"];
  message: string;
  failureCount: number;
};

const providerStates = new Map<string, ProviderState>();

function getPolicy(): MarketDataCachePolicy {
  return DEFAULT_MARKET_DATA_CACHE_POLICY;
}

export function isProviderCircuitOpen(
  providerId: string,
  now = Date.now(),
): boolean {
  const state = providerStates.get(providerId);
  if (!state) return false;
  if (now >= state.openUntil) {
    providerStates.delete(providerId);
    return false;
  }
  return true;
}

export function getProviderCircuitReason(
  providerId: string,
): string | null {
  const state = providerStates.get(providerId);
  if (!state) return null;
  if (Date.now() >= state.openUntil) {
    providerStates.delete(providerId);
    return null;
  }
  return state.message;
}

export function getProviderCircuitSnapshot(
  providerId: string,
  now = Date.now(),
): {
  open: boolean;
  openUntil: string | null;
  reason: string | null;
  failureCount: number;
} {
  const state = providerStates.get(providerId);
  if (!state || now >= state.openUntil) {
    return {
      open: false,
      openUntil: null,
      reason: null,
      failureCount: 0,
    };
  }

  return {
    open: true,
    openUntil: new Date(state.openUntil).toISOString(),
    reason: state.message,
    failureCount: state.failureCount,
  };
}

export function recordProviderCircuitSuccess(providerId: string): void {
  if (!providerStates.has(providerId)) {
    return;
  }

  const previous = providerStates.get(providerId);
  providerStates.delete(providerId);

  console.info("[market-data] provider circuit cleared after successful response", {
    providerId,
    previousReason: previous?.reason ?? null,
    previousOpenUntil: previous ? new Date(previous.openUntil).toISOString() : null,
  });
}

export function recordProviderCircuitFailure(
  providerId: string,
  error: unknown,
): NormalizedProviderError {
  const normalized = normalizeProviderError(error);
  if (!isProviderUnavailable(normalized)) {
    return normalized;
  }

  const policy = getPolicy();
  const existing = providerStates.get(providerId);
  const failureCount = (existing?.failureCount ?? 0) + 1;

  let cooldownMs = policy.providerCooldownMs.temporaryErrorBase;
  if (normalized.kind === "quota_exhausted") {
    cooldownMs = policy.providerCooldownMs.quotaExceeded;
  } else if (normalized.kind === "rate_limited") {
    cooldownMs =
      normalized.retryAfterMs ?? policy.providerCooldownMs.rateLimitedDefault;
  } else if (isProviderQuotaOrRateLimit(normalized)) {
    cooldownMs = policy.providerCooldownMs.rateLimitedDefault;
  } else {
    cooldownMs = Math.min(
      policy.providerCooldownMs.temporaryErrorMax,
      policy.providerCooldownMs.temporaryErrorBase *
        Math.pow(2, Math.min(failureCount - 1, 4)),
    );
  }

  const openUntil = Date.now() + cooldownMs;
  providerStates.set(providerId, {
    openUntil,
    reason: normalized.kind,
    message: normalized.message,
    failureCount,
  });

  console.warn("[market-data] provider circuit opened", {
    providerId,
    kind: normalized.kind,
    httpStatus: normalized.status,
    failureCount,
    cooldownMs,
    openUntil: new Date(openUntil).toISOString(),
    retryAfterMs: normalized.retryAfterMs,
    message: normalized.message,
  });

  return normalized;
}

export function assertProviderAvailable(providerId: string): void {
  if (isProviderCircuitOpen(providerId)) {
    const reason = getProviderCircuitReason(providerId);
    throw new Error(reason ?? "Provider temporarily unavailable.");
  }
}

export function resetProviderCircuitForTests(providerId?: string): void {
  if (providerId) {
    providerStates.delete(providerId);
    return;
  }
  providerStates.clear();
}
