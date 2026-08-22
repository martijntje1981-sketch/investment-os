/**
 * Client-side analyst cache and refresh — mirrors portfolio dividend patterns.
 */

import { buildPriceRequestPayload } from "@/lib/client/portfolioPricing";
import { analystCacheKey } from "@/lib/client/portfolioStorageKeys";
import {
  buildPortfolioAnalystSnapshot,
  findAnalystQuoteForHolding,
} from "@/lib/services/analyst";
import type {
  AnalystApiQuote,
  AnalystRecentAction,
  PortfolioAnalystSnapshot,
} from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type AnalystCachePayload = {
  quotes: AnalystApiQuote[];
  recentActions: AnalystRecentAction[];
  cachedAt: string;
  providerAvailable: boolean;
};

let analystRefreshInFlight: Promise<{
  snapshot: PortfolioAnalystSnapshot;
  updated: boolean;
}> | null = null;

export function isAnalystRefreshInFlight(): boolean {
  return analystRefreshInFlight !== null;
}

export function resetAnalystRefreshStateForTests(): void {
  analystRefreshInFlight = null;
}

function markQuotesCached(quotes: AnalystApiQuote[]): AnalystApiQuote[] {
  return quotes.map((quote) =>
    quote.coverageState === "live"
      ? { ...quote, coverageState: "cached" as const }
      : quote,
  );
}

export function readAnalystCache(userSub: string): AnalystCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(analystCacheKey(userSub));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalystCachePayload;
    if (!Array.isArray(parsed.quotes) || !parsed.cachedAt) return null;
    return {
      quotes: parsed.quotes,
      recentActions: Array.isArray(parsed.recentActions) ? parsed.recentActions : [],
      cachedAt: parsed.cachedAt,
      providerAvailable: parsed.providerAvailable !== false,
    };
  } catch {
    return null;
  }
}

export function writeAnalystCache(
  userSub: string,
  quotes: AnalystApiQuote[],
  recentActions: AnalystRecentAction[],
  providerAvailable: boolean,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    analystCacheKey(userSub),
    JSON.stringify({
      quotes,
      recentActions,
      providerAvailable,
      cachedAt: new Date().toISOString(),
    } satisfies AnalystCachePayload),
  );
}

export function isAnalystCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < CACHE_MAX_AGE_MS;
}

export function buildAnalystSnapshotFromCache(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
): PortfolioAnalystSnapshot | null {
  if (!userSub) return null;
  const cache = readAnalystCache(userSub);
  if (!cache) return null;

  const quotes = isAnalystCacheFresh(cache.cachedAt)
    ? cache.quotes
    : markQuotesCached(cache.quotes);

  const coverageState = isAnalystCacheFresh(cache.cachedAt)
    ? undefined
    : cache.providerAvailable
      ? ("cached" as const)
      : ("provider_unavailable" as const);

  return buildPortfolioAnalystSnapshot({
    holdings,
    quotes,
    recentActions: cache.recentActions,
    coverageState,
  });
}

export async function refreshPortfolioAnalyst(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<{
  snapshot: PortfolioAnalystSnapshot;
  quotes: AnalystApiQuote[];
  recentActions: AnalystRecentAction[];
  updated: boolean;
}> {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  if (investments.length === 0) {
    const snapshot = buildPortfolioAnalystSnapshot({
      holdings,
      quotes: [],
      recentActions: [],
    });
    return { snapshot, quotes: [], recentActions: [], updated: false };
  }

  const payload = buildPriceRequestPayload(investments).map((item, index) => ({
    ...item,
    quantity: investments[index]?.quantity ?? 1,
  }));

  const response = await fetch("/api/analyst", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings: payload, includeRecentActions: true }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    quotes?: AnalystApiQuote[];
    recentActions?: AnalystRecentAction[];
    providerAvailable?: boolean;
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Analyst data could not be loaded.");
  }

  const quotes = data.quotes ?? [];
  const recentActions = data.recentActions ?? [];
  const providerAvailable = data.providerAvailable !== false;
  const existingCache = readAnalystCache(userSub);

  if (
    !providerAvailable &&
    quotes.length === 0 &&
    existingCache &&
    existingCache.quotes.length > 0
  ) {
    const snapshot = buildPortfolioAnalystSnapshot({
      holdings,
      quotes: markQuotesCached(existingCache.quotes),
      recentActions: recentActions.length > 0 ? recentActions : existingCache.recentActions,
      coverageState: "provider_unavailable",
    });

    return {
      snapshot,
      quotes: existingCache.quotes,
      recentActions: snapshot.recentActions,
      updated: false,
    };
  }

  writeAnalystCache(userSub, quotes, recentActions, providerAvailable);

  const snapshot = buildPortfolioAnalystSnapshot({
    holdings,
    quotes,
    recentActions,
    coverageState: providerAvailable ? "live" : "provider_unavailable",
  });

  return {
    snapshot,
    quotes,
    recentActions,
    updated: true,
  };
}

export async function tryRefreshPortfolioAnalyst(
  userSub: string | null,
  holdings: StoredPortfolioHolding[],
): Promise<{
  snapshot: PortfolioAnalystSnapshot;
  updated: boolean;
}> {
  const emptySnapshot = buildPortfolioAnalystSnapshot({
    holdings,
    quotes: [],
    recentActions: [],
  });

  if (!userSub || holdings.length === 0) {
    return { snapshot: emptySnapshot, updated: false };
  }

  const cached = buildAnalystSnapshotFromCache(holdings, userSub);
  if (cached && isAnalystCacheFresh(readAnalystCache(userSub)?.cachedAt)) {
    return { snapshot: cached, updated: false };
  }

  if (analystRefreshInFlight) {
    return analystRefreshInFlight;
  }

  const run = (async () => {
    try {
      const result = await refreshPortfolioAnalyst(userSub, holdings);
      return { snapshot: result.snapshot, updated: result.updated };
    } catch {
      const stale = buildAnalystSnapshotFromCache(holdings, userSub);
      if (stale) {
        return { snapshot: stale, updated: false };
      }
      return { snapshot: emptySnapshot, updated: false };
    } finally {
      analystRefreshInFlight = null;
    }
  })();

  analystRefreshInFlight = run;
  return run;
}

export { findAnalystQuoteForHolding };
