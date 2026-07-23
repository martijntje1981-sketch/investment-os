/**
 * Client-side sync from the shared server market snapshot (no provider calls).
 */

import {
  applyCachedPrices,
  applyPricesToHoldings,
  buildPriceRequestPayload,
  countQuotablePriceHoldings,
  filterQuotablePricePayloadForRefresh,
  isRateLimitedPriceError,
  normalizePriceApiQuotes,
  readPriceCacheUpdatedAt,
  writePriceCache,
  type PriceRefreshResult,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import type { PriceApiResponse } from "@/lib/types/portfolioStorage";

export type MarketSnapshotMetadata = {
  success?: boolean;
  lastRefreshedAt: string | null;
  lastSlot: "eu_open" | "us_open" | null;
  lastAmsterdamDate: string | null;
  status: "completed" | "failed" | "running" | null;
  symbolsReceived: number;
};

let snapshotSyncInFlight: Promise<PriceRefreshResult<StoredPortfolioHolding>> | null =
  null;

export function isMarketSnapshotSyncInFlight(): boolean {
  return snapshotSyncInFlight !== null;
}

export function resetMarketSnapshotSyncForTests(): void {
  snapshotSyncInFlight = null;
}

export async function fetchMarketSnapshotMetadata(): Promise<MarketSnapshotMetadata | null> {
  try {
    const response = await fetch("/api/market-snapshot", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as MarketSnapshotMetadata;
  } catch {
    return null;
  }
}

function shouldSkipSnapshotSync(
  userSub: string,
  metadata: MarketSnapshotMetadata | null,
): boolean {
  if (!metadata?.lastRefreshedAt) {
    return false;
  }

  const serverTs = Date.parse(metadata.lastRefreshedAt);
  const localTs = readPriceCacheUpdatedAt(userSub);
  if (!Number.isFinite(serverTs) || localTs === null) {
    return false;
  }

  return localTs >= serverTs;
}

export async function syncPortfolioPricesFromSnapshot<
  T extends StoredPortfolioHolding,
>(
  userSub: string,
  holdings: T[],
  options?: { skipIfLocalCacheCurrent?: boolean },
): Promise<PriceRefreshResult<T>> {
  if (holdings.length === 0) {
    return { holdings, updated: false };
  }

  if (countQuotablePriceHoldings(holdings, userSub) === 0) {
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      message: NO_QUOTABLE_HOLDINGS_MESSAGE,
    };
  }

  if (snapshotSyncInFlight) {
    await snapshotSyncInFlight.catch(() => undefined);
    return {
      holdings: applyCachedPrices(userSub, holdings) as T[],
      updated: false,
      message: "Market snapshot sync already in progress.",
    };
  }

  const run = (async (): Promise<PriceRefreshResult<T>> => {
    try {
      const metadata = await fetchMarketSnapshotMetadata();
      if (
        options?.skipIfLocalCacheCurrent !== false &&
        shouldSkipSnapshotSync(userSub, metadata)
      ) {
        return {
          holdings: applyCachedPrices(userSub, holdings) as T[],
          updated: false,
          message: "Using cached market snapshot.",
        };
      }

      const payload = filterQuotablePricePayloadForRefresh(
        buildPriceRequestPayload(holdings, userSub),
      );

      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: payload }),
        cache: "no-store",
      });

      const data = (await response.json()) as PriceApiResponse;
      if (!response.ok || (!data.success && !data.message)) {
        throw new Error(data.error ?? data.message ?? "Market snapshot unavailable");
      }

      if (data.message === NO_QUOTABLE_HOLDINGS_MESSAGE) {
        return {
          holdings: applyCachedPrices(userSub, holdings) as T[],
          updated: false,
          message: NO_QUOTABLE_HOLDINGS_MESSAGE,
        };
      }

      if (!data.success || !data.prices?.length) {
        return {
          holdings: applyCachedPrices(userSub, holdings) as T[],
          updated: false,
          message: data.message ?? "Market snapshot temporarily unavailable.",
        };
      }

      writePriceCache(userSub, data.prices, {
        lastSuccessfulUpdate:
          data.lastSuccessfulUpdate ?? metadata?.lastRefreshedAt ?? null,
        quoteSource: data.quoteSource ?? "cache",
      });

      const refreshed = applyPricesToHoldings(holdings, normalizePriceApiQuotes(data.prices));
      return {
        holdings: refreshed,
        updated: true,
        message: metadata?.lastRefreshedAt
          ? "Loaded latest scheduled market snapshot."
          : "Loaded cached market prices.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Market snapshot unavailable";
      return {
        holdings: applyCachedPrices(userSub, holdings) as T[],
        updated: false,
        message,
        rateLimited: isRateLimitedPriceError(message),
      };
    } finally {
      snapshotSyncInFlight = null;
    }
  })();

  snapshotSyncInFlight = run as Promise<PriceRefreshResult<StoredPortfolioHolding>>;
  return run;
}

export function formatMarketSnapshotRefreshLabel(
  lastRefreshedAt: string | null | undefined,
): string {
  if (!lastRefreshedAt) {
    return "Awaiting next scheduled market refresh.";
  }

  return `Latest scheduled refresh: ${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(lastRefreshedAt))} (Amsterdam)`;
}
