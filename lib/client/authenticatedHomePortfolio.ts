/**
 * Portfolio metrics for the authenticated Home surface (`/?view=home`).
 */

import {
  summarizeDailyPerformance,
  formatDailyPerformanceCoverageMessage,
  resolveDailyMoveHeroLabel,
  resolveDailyMovePeriodDetail,
  summarizeDailyMovePeriods,
  type DailyPerformer,
} from "@/lib/client/dailyPerformance";
import { loadUserPortfolioHoldings } from "@/lib/client/portfolioPricing";
import { resolvePortfolioTotalValueAvailability } from "@/lib/client/portfolioValuationAvailability";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function readAuthenticatedHomePortfolio(
  userSub: string,
): StoredPortfolioHolding[] {
  return loadUserPortfolioHoldings(userSub);
}

function toHomeHolding(performer: DailyPerformer | null) {
  if (!performer) {
    return { name: "—", change: 0, move: 0 };
  }

  return {
    name: performer.holding.name,
    change: performer.changePercent,
    move: performer.move,
  };
}

export function summarizeAuthenticatedHomePortfolio(
  holdings: StoredPortfolioHolding[],
) {
  const daily = summarizeDailyPerformance(holdings);
  const movePeriods = summarizeDailyMovePeriods(daily.performers);
  const totalAvailability = resolvePortfolioTotalValueAvailability(holdings);

  return {
    totalValue: totalAvailability.totalValue,
    totalValueAvailable: totalAvailability.isAvailable,
    totalValuePartial: totalAvailability.isPartial,
    totalValueCoverageMessage: totalAvailability.coverageMessage,
    todayChange: daily.todayChange,
    todayPercent: daily.todayPercent,
    hasDailyData: daily.hasDailyData,
    validPerformanceCount: daily.validPerformanceCount,
    eligibleMarketHoldingCount: daily.eligibleMarketHoldingCount,
    performanceCoverageComplete: daily.performanceCoverageComplete,
    dailyPerformanceCoverageMessage: formatDailyPerformanceCoverageMessage(daily),
    dailyMoveHeroLabel: resolveDailyMoveHeroLabel(movePeriods),
    dailyMovePeriodDetail: resolveDailyMovePeriodDetail(movePeriods),
    bestHolding: toHomeHolding(daily.bestPerformer),
    worstHolding: toHomeHolding(daily.worstPerformer),
    latestUpdatedAt: daily.latestMarketUpdateAt,
    holdingCount: holdings.length,
  };
}
