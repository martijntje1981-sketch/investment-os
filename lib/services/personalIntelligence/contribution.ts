/**
 * Holding-level contribution to today's portfolio percent move.
 * Pure derivation from DailyPerformer fields — no second pricing engine.
 */

import {
  getHoldingMarketValue,
  type ValuedPosition,
} from "@/lib/client/portfolioAnalysis";
import type { DailyPerformer } from "@/lib/client/dailyPerformance";
import { formatMoverPeriodLabel } from "@/lib/client/performancePeriod";
import type { DayContribution } from "@/lib/services/personalIntelligence/types";

/**
 * Previous portfolio value of performers (sum of value − move).
 * Matches summarizeDailyPerformance's internal previousValue.
 */
export function previousPortfolioValueFromPerformers(
  performers: DailyPerformer[],
): number | null {
  if (performers.length === 0) return null;
  const previous = performers.reduce((sum, item) => {
    const value = getHoldingMarketValue(item.holding) ?? 0;
    return sum + (value - item.move);
  }, 0);
  return previous > 0 ? previous : null;
}

/**
 * Contribution in portfolio percentage points:
 * (holding move / previous portfolio value) × 100
 */
export function contributionPpFromMove(
  move: number,
  previousPortfolioValue: number | null,
): number | null {
  if (
    previousPortfolioValue == null ||
    !Number.isFinite(previousPortfolioValue) ||
    previousPortfolioValue <= 0 ||
    !Number.isFinite(move)
  ) {
    return null;
  }
  return (move / previousPortfolioValue) * 100;
}

export function buildDayContributions(
  performers: DailyPerformer[],
  weightBySymbol?: Map<string, number> | null,
): DayContribution[] {
  const previous = previousPortfolioValueFromPerformers(performers);
  return performers.map((item) => {
    const symbol = item.holding.symbol.trim().toUpperCase();
    const weight =
      weightBySymbol?.get(symbol) ??
      weightBySymbol?.get(item.holding.symbol) ??
      null;
    const periodLabel = formatMoverPeriodLabel(item.holding).trim() || null;
    return {
      symbol: item.holding.symbol,
      name: item.holding.name || item.holding.symbol,
      move: item.move,
      changePercent: item.changePercent,
      contributionPp: contributionPpFromMove(item.move, previous),
      weightPercent: weight,
      assetType: item.holding.assetType ?? null,
      periodLabel,
    };
  });
}

/** Rank by absolute contribution pp, then |move|. */
export function rankContributionsByMateriality(
  contributions: DayContribution[],
): DayContribution[] {
  return [...contributions].sort((a, b) => {
    const aPp = a.contributionPp;
    const bPp = b.contributionPp;
    if (aPp != null && bPp != null) {
      const diff = Math.abs(bPp) - Math.abs(aPp);
      if (diff !== 0) return diff;
    } else if (aPp != null) {
      return -1;
    } else if (bPp != null) {
      return 1;
    }
    return Math.abs(b.move) - Math.abs(a.move);
  });
}

export function weightMapFromValuedPositions(
  positions: ValuedPosition[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const position of positions) {
    const key = position.holding.symbol.trim().toUpperCase();
    map.set(key, position.weightPercent);
  }
  return map;
}
