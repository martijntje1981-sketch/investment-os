"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { calculateCashImpact } from "@/lib/services/cashIntelligence/calculateCashImpact";
import {
  CASH_INTELLIGENCE_DISCLAIMER,
  type CashBenchmarksSnapshot,
  type CashIntelligenceSnapshot,
} from "@/lib/services/cashIntelligence/types";
import type { BaseCurrencyFxRatesBag } from "@/lib/services/prices/baseCurrencyFxSnapshot";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { usePortfolioBaseCurrency } from "@/lib/client/usePortfolioBaseCurrency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type CashIntelligenceApiResponse = {
  success: boolean;
  benchmarks?: CashBenchmarksSnapshot;
  fx?: {
    baseCurrency: string;
    rates: BaseCurrencyFxRatesBag;
    status: "identity" | "current" | "cached" | "stale" | "unavailable";
    updatedAt: string | null;
  };
  disclaimer?: string;
  error?: string;
};

export function useCashIntelligence(
  holdings: StoredPortfolioHolding[],
  enabled = true,
) {
  const { baseCurrency } = usePortfolioBaseCurrency();
  const [benchmarks, setBenchmarks] = useState<CashBenchmarksSnapshot | null>(
    null,
  );
  const [fxRates, setFxRates] = useState<BaseCurrencyFxRatesBag>({
    EUR: 1,
    USD_TO_EUR: null,
    GBP_TO_EUR: null,
  });
  const [fxStatus, setFxStatus] = useState<
    "identity" | "current" | "cached" | "stale" | "unavailable"
  >("identity");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState(CASH_INTELLIGENCE_DISCLAIMER);

  const reload = useCallback(async () => {
    if (!enabled) {
      setBenchmarks(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/cash-intelligence?baseCurrency=${encodeURIComponent(baseCurrency)}`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json()) as CashIntelligenceApiResponse;
      if (!payload.success || !payload.benchmarks) {
        throw new Error(payload.error ?? "Cash intelligence unavailable");
      }

      setBenchmarks(payload.benchmarks);
      if (payload.fx?.rates) {
        setFxRates(payload.fx.rates);
        setFxStatus(payload.fx.status);
      }
      setDisclaimer(payload.disclaimer ?? CASH_INTELLIGENCE_DISCLAIMER);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cash intelligence unavailable",
      );
    } finally {
      setIsLoading(false);
    }
  }, [baseCurrency, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);

  const snapshot: CashIntelligenceSnapshot | null = useMemo(() => {
    if (!benchmarks) return null;
    return calculateCashImpact({
      holdings,
      benchmarks,
      baseCurrency,
      fxRates,
      fxStatus,
      portfolioCashWeightPercent: analysis.cashWeightPercent,
    });
  }, [
    analysis.cashWeightPercent,
    baseCurrency,
    benchmarks,
    fxRates,
    fxStatus,
    holdings,
  ]);

  return {
    snapshot,
    isLoading,
    error,
    disclaimer,
    reload,
  };
}
