import { EodhdProviderError } from "@/lib/services/instruments/eodhdClient";
import type { ProviderFailureKind } from "@/lib/services/prices/types";

export type NormalizedProviderErrorKind =
  | ProviderFailureKind
  | "unauthorized"
  | "not_found"
  | "invalid_response";

export type NormalizedProviderError = {
  kind: NormalizedProviderErrorKind;
  status: number | null;
  message: string;
  retryAfterMs: number | null;
};

export function classifyHttpProviderError(
  status: number,
  body: string,
  retryAfterHeader?: string | null,
): NormalizedProviderError {
  const message = body.trim() || `HTTP ${status}`;

  if (status === 402) {
    return {
      kind: "quota_exhausted",
      status,
      message,
      retryAfterMs: null,
    };
  }

  if (status === 429) {
    const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
    return {
      kind: "rate_limited",
      status,
      message,
      retryAfterMs,
    };
  }

  if (status === 401 || status === 403) {
    return {
      kind: "unauthorized",
      status,
      message,
      retryAfterMs: null,
    };
  }

  if (status === 404) {
    return {
      kind: "not_found",
      status,
      message,
      retryAfterMs: null,
    };
  }

  if (status >= 500) {
    return {
      kind: "provider_error",
      status,
      message,
      retryAfterMs: null,
    };
  }

  return {
    kind: "provider_error",
    status,
    message,
    retryAfterMs: null,
  };
}

export function normalizeProviderError(error: unknown): NormalizedProviderError {
  if (error instanceof EodhdProviderError) {
    return classifyHttpProviderError(error.status, error.message);
  }

  if (error instanceof Error) {
    if (/timeout|timed out|abort/i.test(error.message)) {
      return {
        kind: "timeout",
        status: null,
        message: error.message,
        retryAfterMs: null,
      };
    }

    const statusMatch = error.message.match(/returned (\d{3})/i);
    if (statusMatch) {
      return classifyHttpProviderError(Number(statusMatch[1]), error.message);
    }
  }

  return {
    kind: "provider_error",
    status: null,
    message:
      error instanceof Error ? error.message : "Unknown provider error.",
    retryAfterMs: null,
  };
}

export function isProviderQuotaOrRateLimit(
  error: NormalizedProviderError,
): boolean {
  return error.kind === "quota_exhausted" || error.kind === "rate_limited";
}

export function isProviderUnavailable(error: NormalizedProviderError): boolean {
  return (
    error.kind === "quota_exhausted" ||
    error.kind === "rate_limited" ||
    error.kind === "timeout" ||
    error.kind === "provider_error" ||
    error.kind === "unauthorized"
  );
}

function parseRetryAfterMs(value: string | null | undefined): number | null {
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

export const MATCHING_UNAVAILABLE_WARNING =
  "Instrument lookup is temporarily unavailable. Select a listing manually or try again later.";

export const MATCHING_UNAVAILABLE_AFTER_SAVE_MESSAGE =
  "Market data is temporarily unavailable. Your holding has been saved and will update automatically later.";
