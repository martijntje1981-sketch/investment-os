/**
 * Temporary diagnostics for market-data provider responses.
 * Logs HTTP status, body preview, and rate-limit headers when present.
 */

export type ProviderRateLimitDiagnostics = {
  httpStatus: number;
  retryAfterMs: number | null;
  remainingQuota: string | null;
  resetTimestamp: string | null;
  responseBodyPreview: string;
  rateLimitHeaders: Record<string, string>;
};

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

export function logMarketDataProviderResponse(
  context: string,
  diagnostics: ProviderRateLimitDiagnostics & {
    providerSymbol?: string;
    providerId?: string;
    circuitOpen?: boolean;
    circuitOpenUntil?: string | null;
  },
): void {
  console.info(`[market-data] ${context}`, {
    httpStatus: diagnostics.httpStatus,
    providerSymbol: diagnostics.providerSymbol ?? null,
    providerId: diagnostics.providerId ?? null,
    remainingQuota: diagnostics.remainingQuota,
    resetTimestamp: diagnostics.resetTimestamp,
    retryAfterMs: diagnostics.retryAfterMs,
    circuitOpen: diagnostics.circuitOpen ?? null,
    circuitOpenUntil: diagnostics.circuitOpenUntil ?? null,
    rateLimitHeaders: diagnostics.rateLimitHeaders,
    responseBodyPreview: diagnostics.responseBodyPreview,
  });
}
