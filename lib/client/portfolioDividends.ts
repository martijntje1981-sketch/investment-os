/**
 * Client-side dividend cache and refresh — mirrors portfolio pricing patterns.
 */

import { buildPriceRequestPayload } from "@/lib/client/portfolioPricing";
import { dividendCacheKey } from "@/lib/client/portfolioStorageKeys";
import {
  buildPortfolioDividendSnapshot,
  findDividendQuoteForHolding,
} from "@/lib/services/dividends";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;

type DividendCachePayload = {
  quotes: DividendApiQuote[];
  cachedAt: string;
};

export function readDividendCache(userSub: string): DividendCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(dividendCacheKey(userSub));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DividendCachePayload;
    if (!Array.isArray(parsed.quotes) || !parsed.cachedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDividendCache(
  userSub: string,
  quotes: DividendApiQuote[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    dividendCacheKey(userSub),
    JSON.stringify({
      quotes,
      cachedAt: new Date().toISOString(),
    } satisfies DividendCachePayload),
  );
}

export function isDividendCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < CACHE_MAX_AGE_MS;
}

export function buildDividendSnapshotFromCache(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
): PortfolioDividendSnapshot | null {
  if (!userSub) return null;
  const cache = readDividendCache(userSub);
  if (!cache || !isDividendCacheFresh(cache.cachedAt)) return null;
  return buildPortfolioDividendSnapshot(holdings, cache.quotes);
}

export async function refreshPortfolioDividends(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<{
  snapshot: PortfolioDividendSnapshot;
  quotes: DividendApiQuote[];
  updated: boolean;
}> {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  if (investments.length === 0) {
    const snapshot = buildPortfolioDividendSnapshot(holdings, []);
    return { snapshot, quotes: [], updated: false };
  }

  const payload = buildPriceRequestPayload(investments).map((item, index) => ({
    ...item,
    quantity: investments[index]?.quantity ?? 1,
  }));

  const response = await fetch("/api/dividends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings: payload }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    quotes?: DividendApiQuote[];
    error?: string;
  };

  if (!response.ok || !data.success || !data.quotes) {
    throw new Error(data.error ?? "Dividend data could not be loaded.");
  }

  writeDividendCache(userSub, data.quotes);
  const snapshot = buildPortfolioDividendSnapshot(holdings, data.quotes);

  return {
    snapshot,
    quotes: data.quotes,
    updated: true,
  };
}

export async function tryRefreshPortfolioDividends(
  userSub: string | null,
  holdings: StoredPortfolioHolding[],
): Promise<{
  snapshot: PortfolioDividendSnapshot;
  updated: boolean;
}> {
  const emptySnapshot = buildPortfolioDividendSnapshot(holdings, []);

  if (!userSub || holdings.length === 0) {
    return { snapshot: emptySnapshot, updated: false };
  }

  const cached = buildDividendSnapshotFromCache(holdings, userSub);
  if (cached) {
    return { snapshot: cached, updated: false };
  }

  try {
    const result = await refreshPortfolioDividends(userSub, holdings);
    return { snapshot: result.snapshot, updated: result.updated };
  } catch {
    return { snapshot: emptySnapshot, updated: false };
  }
}

export { findDividendQuoteForHolding };
