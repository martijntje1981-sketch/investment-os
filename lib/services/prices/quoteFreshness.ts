/**
 * Quote trust is derived from provider/market time, not cache TTL.
 * Cache TTL only decides whether a passive load may reuse a quote.
 */

import {
  resolveMarketDataStatus,
  type MarketDataStatus,
} from "@/lib/services/prices/marketQuote";

export type QuoteTrustState =
  | "fresh"
  | "delayed_current"
  | "stale"
  | "unavailable";

export type QuoteTrustInput = {
  currentPrice?: number | null;
  updatedAt?: string | null;
  fetchedAt?: string | null;
  dataStatus?: MarketDataStatus | null;
  now?: number;
};

function hasUsablePrice(price: number | null | undefined): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

export function classifyQuoteTrustState(input: QuoteTrustInput): QuoteTrustState {
  if (!hasUsablePrice(input.currentPrice)) {
    return "unavailable";
  }

  const status = resolveMarketDataStatus(
    input.updatedAt ?? null,
    true,
    input.now ?? Date.now(),
  );

  if (status === "live") return "fresh";
  if (status === "delayed") return "delayed_current";
  if (status === "stale") return "stale";
  return "unavailable";
}

export function quoteTrustToDataStatus(trust: QuoteTrustState): MarketDataStatus {
  if (trust === "fresh") return "live";
  if (trust === "delayed_current") return "delayed";
  if (trust === "stale") return "stale";
  return "unavailable";
}

export function isUsableQuoteTrustState(trust: QuoteTrustState): boolean {
  return trust === "fresh" || trust === "delayed_current";
}

/** Last-session closes remain usable when they are the newest provider quote. */
export function isDisplayableQuoteTrustState(trust: QuoteTrustState): boolean {
  return trust === "fresh" || trust === "delayed_current" || trust === "stale";
}

export function overlayQuoteTrust<
  T extends {
    currentPrice?: number | null;
    updatedAt?: string | null;
    fetchedAt?: string | null;
    dataStatus?: MarketDataStatus;
    isStale?: boolean;
  },
>(quote: T, now = Date.now()): T {
  const trust = classifyQuoteTrustState({
    currentPrice: quote.currentPrice,
    updatedAt: quote.updatedAt,
    fetchedAt: quote.fetchedAt,
    now,
  });

  return {
    ...quote,
    dataStatus: quoteTrustToDataStatus(trust),
    isStale: trust === "stale",
  };
}

export function quotesAreCurrentEnough(
  quotes: Array<{
    currentPrice?: number | null;
    updatedAt?: string | null;
    dataStatus?: MarketDataStatus | null;
  }>,
  now = Date.now(),
): boolean {
  if (quotes.length === 0) return false;
  return quotes.every((quote) =>
    isUsableQuoteTrustState(
      classifyQuoteTrustState({
        currentPrice: quote.currentPrice,
        updatedAt: quote.updatedAt,
        dataStatus: quote.dataStatus,
        now,
      }),
    ),
  );
}
