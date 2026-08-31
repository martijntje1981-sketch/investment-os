/**
 * Client hook for multi-range portfolio performance history (not 1D).
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  holdingsFingerprint,
  peekPortfolioPerformanceHistory,
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
 * Cached success for this user+fingerprint stays visible while a later request runs.
 */
export function usePortfolioPerformanceHistory(
  holdings: StoredPortfolioHolding[],
  period: PerformancePeriodId,
  enabled = true,
): UsePortfolioPerformanceHistoryResult {
  const { userSub } = useUserPortfolio();
  const fingerprint = useMemo(() => holdingsFingerprint(holdings), [holdings]);
  const peeked =
    enabled && userSub && period !== "1D" && holdings.length > 0
      ? peekPortfolioPerformanceHistory(userSub, period, fingerprint)
      : null;
  const identityKey = `${userSub ?? ""}:${period}:${fingerprint}:${enabled ? "1" : "0"}`;
  const [data, setData] = useState<PortfolioPerformanceHistoryApiResponse | null>(
    peeked,
  );
  const [isLoading, setIsLoading] = useState(!peeked && enabled && holdings.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [scopedIdentity, setScopedIdentity] = useState(identityKey);
  const requestIdRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  if (scopedIdentity !== identityKey) {
    setScopedIdentity(identityKey);
    setData(peeked);
    setIsLoading(
      !peeked &&
        enabled &&
        holdings.length > 0 &&
        period !== "1D" &&
        Boolean(userSub),
    );
    setError(null);
  }

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

    const cached = peekPortfolioPerformanceHistory(userSub, period, fingerprint);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setData(null);
      setIsLoading(true);
    }
    setError(null);

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    void (async () => {
      const result = await requestPortfolioPerformanceHistory({
        userSub,
        period,
        holdings,
      });

      if (cancelled || requestId !== requestIdRef.current) return;

      if (!result.ok) {
        if (!dataRef.current && !cached) {
          setData(null);
        }
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
