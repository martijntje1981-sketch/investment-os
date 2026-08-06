/**
 * Client hook for portfolio analyst intelligence.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildAnalystSnapshotFromCache,
  isAnalystCacheFresh,
  readAnalystCache,
  tryRefreshPortfolioAnalyst,
} from "@/lib/client/portfolioAnalyst";
import { buildPortfolioAnalystSnapshot } from "@/lib/services/analyst";
import type {
  AnalystApiQuote,
  AnalystRecentAction,
  PortfolioAnalystSnapshot,
} from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const EMPTY_SNAPSHOT = buildPortfolioAnalystSnapshot({
  holdings: [],
  quotes: [],
  recentActions: [],
});

export function usePortfolioAnalyst(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const [snapshot, setSnapshot] = useState<PortfolioAnalystSnapshot>(() => {
    if (!userSub) return EMPTY_SNAPSHOT;
    return (
      buildAnalystSnapshotFromCache(holdings, userSub) ??
      buildPortfolioAnalystSnapshot({ holdings, quotes: [], recentActions: [] })
    );
  });
  const [quotes, setQuotes] = useState<AnalystApiQuote[]>(() => {
    if (!userSub) return [];
    return readAnalystCache(userSub)?.quotes ?? [];
  });
  const [recentActions, setRecentActions] = useState<AnalystRecentAction[]>(() => {
    if (!userSub) return [];
    return readAnalystCache(userSub)?.recentActions ?? [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !userSub) return false;
    if (holdings.every((holding) => holding.assetType === "cash")) return false;
    const cache = readAnalystCache(userSub);
    return !(cache && isAnalystCacheFresh(cache.cachedAt));
  });
  const [ready, setReady] = useState(false);

  const investmentCount = useMemo(
    () => holdings.filter((holding) => holding.assetType !== "cash").length,
    [holdings],
  );

  const reload = useCallback(async () => {
    if (!enabled || !userSub || investmentCount === 0) {
      setSnapshot(
        buildPortfolioAnalystSnapshot({ holdings, quotes: [], recentActions: [] }),
      );
      setQuotes([]);
      setRecentActions([]);
      setReady(true);
      return;
    }

    const cache = userSub ? readAnalystCache(userSub) : null;
    const hasFreshCache = Boolean(cache && isAnalystCacheFresh(cache.cachedAt));

    if (!hasFreshCache) {
      setIsLoading(true);
    }
    try {
      const result = await tryRefreshPortfolioAnalyst(userSub, holdings);
      setSnapshot(result.snapshot);
      const cache = readAnalystCache(userSub);
      setQuotes(cache?.quotes ?? []);
      setRecentActions(cache?.recentActions ?? []);
    } catch {
      const cache = readAnalystCache(userSub);
      setSnapshot(
        buildAnalystSnapshotFromCache(holdings, userSub) ??
          buildPortfolioAnalystSnapshot({ holdings, quotes: [], recentActions: [] }),
      );
      setQuotes(cache?.quotes ?? []);
      setRecentActions(cache?.recentActions ?? []);
    } finally {
      setIsLoading(false);
      setReady(true);
    }
  }, [enabled, holdings, investmentCount, userSub]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    snapshot,
    quotes,
    recentActions,
    isLoading,
    ready,
    reload,
  };
}
