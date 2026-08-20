/**
 * Client hook for multi-range portfolio performance history (not 1D).
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  holdingsFingerprint,
  requestPortfolioPerformanceHistory,
} from "@/lib/client/portfolioPerformanceHistoryRequest";
import type { PerformancePeriodId } from "@/lib/client/performance/types";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type UsePortfolioPerformanceHistoryResult = {
  data: PortfolioPerformanceHistoryApiResponse | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * POSTs /api/portfolio/performance when `period` is not 1D.
 * 1D stays on calculatePortfolioPerformance (previousClose).
 * Same user + period + holdings fingerprint shares one in-flight/cached result.
 */
export function usePortfolioPerformanceHistory(
  holdings: StoredPortfolioHolding[],
  period: PerformancePeriodId,
  enabled = true,
): UsePortfolioPerformanceHistoryResult {
  const { userSub } = useUserPortfolio();
  const [data, setData] =
    useState<PortfolioPerformanceHistoryApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fingerprint = useMemo(() => holdingsFingerprint(holdings), [holdings]);

  useEffect(() => {
    if (!enabled || period === "1D" || !userSub) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (holdings.length === 0) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      const result = await requestPortfolioPerformanceHistory({
        userSub,
        period,
        holdings,
      });

      if (cancelled || requestId !== requestIdRef.current) return;

      if (!result.ok) {
        setData(null);
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setData(result.data);
      setError(null);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // fingerprint captures holdings identity for the request
    // eslint-disable-next-line react-hooks/exhaustive-deps -- holdings via fingerprint
  }, [period, fingerprint, enabled, userSub]);

  return { data, isLoading, error };
}
