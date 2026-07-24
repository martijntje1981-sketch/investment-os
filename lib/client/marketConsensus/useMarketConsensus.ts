"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { emptyPortfolioConsensusSummary } from "@/lib/client/marketConsensus/consensusHelpers";
import {
  isMarketConsensusCacheFresh,
  readMarketConsensusCache,
  tryRefreshMarketConsensus,
} from "@/lib/client/marketConsensus/portfolioMarketConsensus";
import type {
  AnalystConsensusResult,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function useMarketConsensus(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const investmentCount = useMemo(
    () => holdings.filter((holding) => holding.assetType !== "cash").length,
    [holdings],
  );

  const [results, setResults] = useState<AnalystConsensusResult[]>(() => {
    if (!userSub) return [];
    return readMarketConsensusCache(userSub)?.results ?? [];
  });
  const [summary, setSummary] = useState<PortfolioConsensusSummary>(() => {
    if (!userSub) {
      return emptyPortfolioConsensusSummary(investmentCount);
    }

    return (
      readMarketConsensusCache(userSub)?.summary ??
      emptyPortfolioConsensusSummary(investmentCount)
    );
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !userSub || investmentCount === 0) return false;
    const cache = readMarketConsensusCache(userSub);
    return !(cache && isMarketConsensusCacheFresh(cache.cachedAt));
  });
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !userSub || investmentCount === 0) {
      setResults([]);
      setSummary(emptyPortfolioConsensusSummary(investmentCount));
      setReady(true);
      return;
    }

    const cache = readMarketConsensusCache(userSub);
    const hasFreshCache = Boolean(cache && isMarketConsensusCacheFresh(cache.cachedAt));

    if (!hasFreshCache) {
      setIsLoading(true);
    }

    try {
      const payload = await tryRefreshMarketConsensus(userSub, holdings);
      setResults(payload.results);
      setSummary(payload.summary);
    } catch {
      const fallback = readMarketConsensusCache(userSub);
      setResults(fallback?.results ?? []);
      setSummary(
        fallback?.summary ?? emptyPortfolioConsensusSummary(investmentCount),
      );
    } finally {
      setIsLoading(false);
      setReady(true);
    }
  }, [enabled, holdings, investmentCount, userSub]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    results,
    summary,
    isLoading,
    ready,
    reload,
  };
}
