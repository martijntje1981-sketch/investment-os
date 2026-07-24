/**
 * Client-side market consensus cache and refresh.
 */

import { marketConsensusCacheKey } from "@/lib/client/portfolioStorageKeys";
import { emptyPortfolioConsensusSummary } from "@/lib/client/marketConsensus/consensusHelpers";
import type {
  AnalystConsensusResult,
  MarketConsensusApiResponse,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type MarketConsensusCachePayload = {
  results: AnalystConsensusResult[];
  summary: PortfolioConsensusSummary;
  cachedAt: string;
  providerAvailable: boolean;
};

let marketConsensusRefreshInFlight: Promise<MarketConsensusCachePayload | null> | null =
  null;

export function resetMarketConsensusRefreshStateForTests(): void {
  marketConsensusRefreshInFlight = null;
}

export function isMarketConsensusRefreshInFlight(): boolean {
  return marketConsensusRefreshInFlight !== null;
}

export function readMarketConsensusCache(
  userSub: string,
): MarketConsensusCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(marketConsensusCacheKey(userSub));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MarketConsensusCachePayload;
    if (!Array.isArray(parsed.results) || !parsed.cachedAt || !parsed.summary) {
      return null;
    }

    return {
      results: parsed.results,
      summary: parsed.summary,
      cachedAt: parsed.cachedAt,
      providerAvailable: parsed.providerAvailable !== false,
    };
  } catch {
    return null;
  }
}

export function writeMarketConsensusCache(
  userSub: string,
  payload: Omit<MarketConsensusCachePayload, "cachedAt">,
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    marketConsensusCacheKey(userSub),
    JSON.stringify({
      ...payload,
      cachedAt: new Date().toISOString(),
    } satisfies MarketConsensusCachePayload),
  );
}

export function isMarketConsensusCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < CACHE_MAX_AGE_MS;
}

export async function refreshMarketConsensus(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<MarketConsensusCachePayload> {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  const investmentCount = investments.length;

  if (investmentCount === 0) {
    const emptyPayload = {
      results: [],
      summary: emptyPortfolioConsensusSummary(0),
      providerAvailable: false,
    };
    writeMarketConsensusCache(userSub, emptyPayload);
    return { ...emptyPayload, cachedAt: new Date().toISOString() };
  }

  const response = await fetch("/api/market-consensus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings }),
  });

  const data = (await response.json()) as MarketConsensusApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Market consensus request failed.");
  }

  const payload = {
    results: data.results,
    summary: data.summary,
    providerAvailable: data.providerAvailable,
  };

  writeMarketConsensusCache(userSub, payload);

  return {
    ...payload,
    cachedAt: new Date().toISOString(),
  };
}

export async function tryRefreshMarketConsensus(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<MarketConsensusCachePayload> {
  const cache = readMarketConsensusCache(userSub);
  if (cache && isMarketConsensusCacheFresh(cache.cachedAt)) {
    return cache;
  }

  if (marketConsensusRefreshInFlight) {
    const pending = await marketConsensusRefreshInFlight;
    if (pending) {
      return pending;
    }
  }

  marketConsensusRefreshInFlight = (async () => {
    try {
      return await refreshMarketConsensus(userSub, holdings);
    } catch {
      if (cache) {
        return cache;
      }

      const investmentCount = holdings.filter(
        (holding) => holding.assetType !== "cash",
      ).length;

      return {
        results: [],
        summary: emptyPortfolioConsensusSummary(investmentCount),
        cachedAt: new Date().toISOString(),
        providerAvailable: false,
      };
    } finally {
      marketConsensusRefreshInFlight = null;
    }
  })();

  return (await marketConsensusRefreshInFlight)!;
}
