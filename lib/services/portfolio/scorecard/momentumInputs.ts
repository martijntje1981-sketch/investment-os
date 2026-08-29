/**
 * Build Momentum Score inputs from performance history + daily breadth.
 * Lookbacks: 1W and 1M via /api/portfolio/performance (cached by that API).
 * Breadth uses latest-session movers only — never substituted for 1W/1M returns.
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import type {
  BuildMomentumScoreInput,
  MomentumBreadthSnapshot,
  MomentumPeriodSnapshot,
} from "@/lib/services/portfolio/scorecard/buildMomentumScore";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function toMomentumPeriodSnapshot(
  data: PortfolioPerformanceHistoryApiResponse | null,
  period: "1W" | "1M",
): MomentumPeriodSnapshot {
  if (
    !data ||
    !data.success ||
    data.period !== period ||
    data.investmentReturnPercent == null ||
    !Number.isFinite(data.investmentReturnPercent) ||
    data.dataAvailability === "unavailable"
  ) {
    return {
      period,
      returnPercent: null,
      available: false,
      coveredHoldingCount: data?.coveredHoldingCount,
      skippedHoldingCount: data?.skippedHoldingCount,
    };
  }

  return {
    period,
    returnPercent: data.investmentReturnPercent,
    available: true,
    coveredHoldingCount: data.coveredHoldingCount,
    skippedHoldingCount: data.skippedHoldingCount,
  };
}

export function buildMomentumBreadthFromHoldings(
  holdings: StoredPortfolioHolding[],
): MomentumBreadthSnapshot | null {
  const daily = summarizeDailyPerformance(holdings);
  if (!daily.hasDailyData || daily.performers.length === 0) {
    return null;
  }

  const measured = daily.performers;
  const positiveCount = measured.filter(
    (p) => p.move > 0 || p.changePercent > 0,
  ).length;
  const absMoves = measured.map((p) => Math.abs(p.move));
  const totalAbs = absMoves.reduce((sum, v) => sum + v, 0);
  const top = [...measured].sort(
    (a, b) => Math.abs(b.move) - Math.abs(a.move),
  )[0];

  return {
    measuredCount: measured.length,
    positiveCount,
    topContributorSharePercent:
      top && totalAbs > 0
        ? Math.round((Math.abs(top.move) / totalAbs) * 1000) / 10
        : null,
    topContributorSymbol: top?.holding.symbol ?? null,
  };
}

export function buildMomentumScoreInputFromHistory(params: {
  week: PortfolioPerformanceHistoryApiResponse | null;
  month: PortfolioPerformanceHistoryApiResponse | null;
  holdings: StoredPortfolioHolding[];
  calculatedAt?: string;
}): BuildMomentumScoreInput {
  return {
    week: toMomentumPeriodSnapshot(params.week, "1W"),
    month: toMomentumPeriodSnapshot(params.month, "1M"),
    breadth: buildMomentumBreadthFromHoldings(params.holdings),
    calculatedAt: params.calculatedAt,
  };
}
