/**
 * Client hook for portfolio dividend intelligence.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildDividendSnapshotFromCache,
  readDividendCache,
  tryRefreshPortfolioDividends,
} from "@/lib/client/portfolioDividends";
import { buildPortfolioDividendSnapshot } from "@/lib/services/dividends";
import type {
  DividendApiQuote,
  PortfolioDividendSnapshot,
} from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const EMPTY_SNAPSHOT = buildPortfolioDividendSnapshot([], []);

export function usePortfolioDividends(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const [snapshot, setSnapshot] = useState<PortfolioDividendSnapshot>(() => {
    if (!userSub) return EMPTY_SNAPSHOT;
    return (
      buildDividendSnapshotFromCache(holdings, userSub) ??
      buildPortfolioDividendSnapshot(holdings, [])
    );
  });
  const [quotes, setQuotes] = useState<DividendApiQuote[]>(() => {
    if (!userSub) return [];
    return readDividendCache(userSub)?.quotes ?? [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !userSub) return false;
    if (holdings.every((holding) => holding.assetType === "cash")) return false;
    return buildDividendSnapshotFromCache(holdings, userSub) === null;
  });
  const [ready, setReady] = useState(false);

  const investmentCount = useMemo(
    () => holdings.filter((holding) => holding.assetType !== "cash").length,
    [holdings],
  );

  const reload = useCallback(async () => {
    if (!enabled || !userSub || investmentCount === 0) {
      setSnapshot(buildPortfolioDividendSnapshot(holdings, []));
      setQuotes([]);
      setReady(true);
      return;
    }

    const hasFreshCache =
      Boolean(userSub) &&
      buildDividendSnapshotFromCache(holdings, userSub) !== null;

    if (!hasFreshCache) {
      setIsLoading(true);
    }
    try {
      const result = await tryRefreshPortfolioDividends(userSub, holdings);
      setSnapshot(result.snapshot);
      setQuotes(readDividendCache(userSub)?.quotes ?? []);
    } catch {
      setSnapshot(buildPortfolioDividendSnapshot(holdings, []));
      setQuotes(readDividendCache(userSub)?.quotes ?? []);
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
    isLoading,
    ready,
    reload,
  };
}
