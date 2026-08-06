/**
 * Client hook for multi-range portfolio performance history (not 1D).
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PerformancePeriodId } from "@/lib/client/performance/types";
import type {
  PerformanceHistoryHoldingInput,
  PortfolioPerformanceHistoryApiResponse,
} from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function toHistoryHolding(
  holding: StoredPortfolioHolding,
): PerformanceHistoryHoldingInput {
  return {
    id: holding.id,
    symbol: holding.symbol,
    quantity: holding.quantity,
    providerSymbol: holding.providerSymbol ?? null,
    quoteCurrency: holding.quoteCurrency ?? null,
    assetType: holding.assetType ?? "investment",
    currentPrice: holding.currentPrice,
  };
}

function holdingsFingerprint(holdings: StoredPortfolioHolding[]): string {
  return holdings
    .map((holding) => {
      if (holding.assetType === "cash") {
        return `cash:${holding.id}:${holding.quantity}:${holding.currentPrice}`;
      }
      return [
        holding.id,
        holding.providerSymbol ?? "",
        holding.quantity,
        holding.quoteCurrency ?? "",
      ].join(":");
    })
    .sort()
    .join("|");
}

export type UsePortfolioPerformanceHistoryResult = {
  data: PortfolioPerformanceHistoryApiResponse | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * POSTs /api/portfolio/performance when `period` is not 1D.
 * 1D stays on calculatePortfolioPerformance (previousClose).
 */
export function usePortfolioPerformanceHistory(
  holdings: StoredPortfolioHolding[],
  period: PerformancePeriodId,
): UsePortfolioPerformanceHistoryResult {
  const [data, setData] =
    useState<PortfolioPerformanceHistoryApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fingerprint = useMemo(() => holdingsFingerprint(holdings), [holdings]);

  useEffect(() => {
    if (period === "1D") {
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
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const payloadHoldings = holdings.map(toHistoryHolding);

    void (async () => {
      try {
        const response = await fetch("/api/portfolio/performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            period,
            holdings: payloadHoldings,
          }),
          signal: controller.signal,
        });

        const json =
          (await response.json()) as PortfolioPerformanceHistoryApiResponse & {
            error?: string;
          };

        if (requestId !== requestIdRef.current) return;

        if (!response.ok || !json.success) {
          setData(null);
          setError(json.error ?? "Performance history could not be loaded.");
          return;
        }

        setData(json);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setData(null);
        setError(
          err instanceof Error
            ? err.message
            : "Performance history could not be loaded.",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
    // fingerprint captures holdings identity for the request
    // eslint-disable-next-line react-hooks/exhaustive-deps -- holdings via fingerprint
  }, [period, fingerprint]);

  return { data, isLoading, error };
}
