/**
 * Client hook: Goal Reality Check from existing portfolio performance history.
 */

"use client";

import { useMemo } from "react";

import { getExpectedReturnAssumption } from "@/lib/client/expectedReturnAssumption";
import {
  usePortfolioPerformanceHistory,
  type UsePortfolioPerformanceHistoryResult,
} from "@/lib/client/usePortfolioPerformanceHistory";
import { resolvePerformanceHistoryWindow } from "@/lib/services/performance/resolvePerformanceHistoryWindow";
import {
  buildGoalRealityCandidatesFromHistory,
  buildGoalRealityCheck,
  type GoalRealityCheck,
  type GoalRealityPeriodId,
  type PerformanceHistorySnapshot,
} from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function toSnapshot(
  periodId: Extract<GoalRealityPeriodId, "ALL" | "1Y" | "1M" | "1W">,
  result: UsePortfolioPerformanceHistoryResult,
): PerformanceHistorySnapshot {
  const data = result.data;
  const window = resolvePerformanceHistoryWindow(periodId);

  return {
    periodId,
    success: data?.success === true,
    investmentReturnPercent: data?.investmentReturnPercent ?? null,
    startingValue: data?.startingValue ?? null,
    endingValue: data?.endingValue ?? null,
    chartPoints: data?.chartPoints ?? [],
    dataAvailability: data?.dataAvailability ?? "unavailable",
    availabilityMessage: data?.availabilityMessage ?? result.error,
    historicalFxApproximate: data?.historicalFxApproximate ?? false,
    coveredHoldingCount: data?.coveredHoldingCount ?? 0,
    skippedHoldingCount: data?.skippedHoldingCount ?? 0,
    spanDays: window.spanDays,
  };
}

export type UseGoalRealityCheckResult = {
  realityCheck: GoalRealityCheck;
  isLoading: boolean;
};

/**
 * Fetches verified history (ALL, 1Y, 1M, 1W) and builds Goal Reality Check.
 * Recomputes when expectedAnnualReturn changes.
 */
export function useGoalRealityCheck(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  enabled = true,
): UseGoalRealityCheckResult {
  const expected = getExpectedReturnAssumption(goal);
  const active = enabled && expected != null && holdings.length > 0;

  const allHistory = usePortfolioPerformanceHistory(
    active ? holdings : [],
    "ALL",
  );
  const yearHistory = usePortfolioPerformanceHistory(
    active ? holdings : [],
    "1Y",
  );
  const monthHistory = usePortfolioPerformanceHistory(
    active ? holdings : [],
    "1M",
  );
  const weekHistory = usePortfolioPerformanceHistory(
    active ? holdings : [],
    "1W",
  );

  const isLoading =
    active &&
    (allHistory.isLoading ||
      yearHistory.isLoading ||
      monthHistory.isLoading ||
      weekHistory.isLoading);

  const realityCheck = useMemo(() => {
    if (expected == null) {
      return {
        available: false as const,
        reason: "No saved expected annual return assumption.",
      };
    }
    if (!active) {
      return {
        available: false as const,
        reason: "Portfolio holdings are required for Goal Reality Check.",
      };
    }

    const snapshots: PerformanceHistorySnapshot[] = [
      toSnapshot("ALL", allHistory),
      toSnapshot("1Y", yearHistory),
      toSnapshot("1M", monthHistory),
      toSnapshot("1W", weekHistory),
    ];

    const candidates = buildGoalRealityCandidatesFromHistory(snapshots);
    return buildGoalRealityCheck({
      expectedAnnualReturnPercent: expected,
      candidates,
    });
    // Snapshots read .data/.error; object identity of hook results changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on history payloads
  }, [
    expected,
    active,
    allHistory.data,
    allHistory.error,
    allHistory.isLoading,
    yearHistory.data,
    yearHistory.error,
    yearHistory.isLoading,
    monthHistory.data,
    monthHistory.error,
    monthHistory.isLoading,
    weekHistory.data,
    weekHistory.error,
    weekHistory.isLoading,
  ]);

  return { realityCheck, isLoading };
}
