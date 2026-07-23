/**
 * Optional market-data diagnostics gated by MARKET_DATA_DEBUG=1.
 * Logs rate-limit responses (HTTP 402/429) only — no success or body previews.
 */

export type ProviderRateLimitDiagnostics = {
  httpStatus: number;
  retryAfterMs: number | null;
  remainingQuota: string | null;
  resetTimestamp: string | null;
  responseBodyPreview: string;
  rateLimitHeaders: Record<string, string>;
};

export function isMarketDataDebugEnabled(): boolean {
  return process.env.MARKET_DATA_DEBUG === "1";
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    return Math.max(0, date - Date.now());
  }
  return null;
}

function truncateBody(body: string, max = 500): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

export function extractRateLimitDiagnostics(
  response: Response,
  bodyText: string,
): ProviderRateLimitDiagnostics {
  const rateLimitHeaders: Record<string, string> = {};

  response.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      normalized.includes("rate") ||
      normalized.includes("quota") ||
      normalized.includes("limit") ||
      normalized === "retry-after"
    ) {
      rateLimitHeaders[key] = value;
    }
  });

  const retryAfterHeader =
    response.headers.get("retry-after") ??
    response.headers.get("Retry-After");

  const remainingQuota =
    response.headers.get("x-ratelimit-remaining") ??
    response.headers.get("X-RateLimit-Remaining") ??
    response.headers.get("x-rate-limit-remaining") ??
    null;

  const resetHeader =
    response.headers.get("x-ratelimit-reset") ??
    response.headers.get("X-RateLimit-Reset") ??
    response.headers.get("x-rate-limit-reset") ??
    null;

  let resetTimestamp: string | null = null;
  if (resetHeader) {
    const numeric = Number(resetHeader);
    if (Number.isFinite(numeric) && numeric > 1_000_000_000) {
      resetTimestamp = new Date(numeric * 1000).toISOString();
    } else {
      const parsed = Date.parse(resetHeader);
      resetTimestamp = Number.isFinite(parsed)
        ? new Date(parsed).toISOString()
        : resetHeader;
    }
  }

  return {
    httpStatus: response.status,
    retryAfterMs: parseRetryAfterMs(retryAfterHeader),
    remainingQuota,
    resetTimestamp,
    responseBodyPreview: truncateBody(bodyText),
    rateLimitHeaders,
  };
}

/** Gated refresh-path trace for production debugging (MARKET_DATA_DEBUG=1). */
export function logMarketDataRefreshTrace(
  stage: string,
  payload: Record<string, unknown>,
): void {
  if (!isMarketDataDebugEnabled()) {
    return;
  }

  console.info(`[market-data-trace] ${stage}`, payload);
}

export function logMarketDataRateLimitError(
  context: string,
  input: {
    httpStatus?: number | null;
    providerSymbol?: string;
    providerId?: string;
    retryAfterMs?: number | null;
    remainingQuota?: string | null;
    resetTimestamp?: string | null;
    rateLimitHeaders?: Record<string, string>;
    circuitOpen?: boolean;
    circuitOpenUntil?: string | null;
    kind?: string;
    failureCount?: number;
    cooldownMs?: number;
    openUntil?: string | null;
  },
): void {
  if (!isMarketDataDebugEnabled()) {
    return;
  }

  const isRateLimitResponse =
    input.httpStatus === 402 ||
    input.httpStatus === 429 ||
    input.kind === "quota_exhausted" ||
    input.kind === "rate_limited";

  if (!isRateLimitResponse) {
    return;
  }

  console.warn(`[market-data] ${context}`, {
    httpStatus: input.httpStatus ?? null,
    providerSymbol: input.providerSymbol ?? null,
    providerId: input.providerId ?? null,
    remainingQuota: input.remainingQuota ?? null,
    resetTimestamp: input.resetTimestamp ?? null,
    retryAfterMs: input.retryAfterMs ?? null,
    circuitOpen: input.circuitOpen ?? null,
    circuitOpenUntil: input.circuitOpenUntil ?? null,
    kind: input.kind ?? null,
    failureCount: input.failureCount ?? null,
    cooldownMs: input.cooldownMs ?? null,
    openUntil: input.openUntil ?? null,
    rateLimitHeaders: input.rateLimitHeaders ?? {},
  });
}
