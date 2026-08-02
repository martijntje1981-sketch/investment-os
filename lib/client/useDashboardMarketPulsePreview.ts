/**
 * One-shot Market Pulse preview for the Dashboard.
 * Uses the existing /api/market-pulse endpoint — no polling interval.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { MarketPulseSnapshot } from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holdingsFingerprint(holdings: StoredPortfolioHolding[]): string {
  return holdings
    .map((holding) => {
      if (holding.assetType === "cash") {
        return `cash:${holding.id}:${holding.quantity}`;
      }
      return [
        holding.id,
        holding.providerSymbol ?? holding.symbol,
        holding.quantity,
      ].join(":");
    })
    .sort()
    .join("|");
}

export type UseDashboardMarketPulsePreviewResult = {
  snapshot: MarketPulseSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

export function useDashboardMarketPulsePreview(
  holdings: StoredPortfolioHolding[],
  enabled = true,
): UseDashboardMarketPulsePreviewResult {
  const [snapshot, setSnapshot] = useState<MarketPulseSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fingerprint = useMemo(() => holdingsFingerprint(holdings), [holdings]);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/market-pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdings,
            filter: holdings.length > 0 ? "portfolio" : "all",
            momentumPeriod: "1M",
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          snapshot?: MarketPulseSnapshot;
          error?: string;
        };
        if (requestId !== requestIdRef.current) return;
        if (!response.ok || !payload.success || !payload.snapshot) {
          throw new Error(payload.error ?? "Unable to load Market Pulse.");
        }
        setSnapshot(payload.snapshot);
        setIsLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setSnapshot(null);
        setError(
          err instanceof Error ? err.message : "Unable to load Market Pulse.",
        );
        setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
    // fingerprint captures holdings identity for refetch without deep compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fingerprint]);

  return { snapshot, isLoading, error };
}
