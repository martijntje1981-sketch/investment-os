/**
 * Portfolio metrics for the authenticated Home surface (`/?view=home`).
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { loadUserPortfolioHoldings } from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function readAuthenticatedHomePortfolio(
  userSub: string,
): StoredPortfolioHolding[] {
  return loadUserPortfolioHoldings(userSub);
}

export function summarizeAuthenticatedHomePortfolio(
  holdings: StoredPortfolioHolding[],
) {
  let totalValue = 0;
  let todayChange = 0;
  let latestUpdatedAt: string | null = null;

  const performers: Array<{ name: string; change: number; move: number }> = [];

  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding) ?? 0;
    totalValue += value;

    if (holding.assetType === "cash") {
      continue;
    }

    const changePercent =
      typeof holding.changePercent === "number" &&
      Number.isFinite(holding.changePercent) &&
      holding.changePercent > -100
        ? holding.changePercent
        : null;

    let move = 0;
    if (changePercent !== null && value > 0) {
      const previousValue = value / (1 + changePercent / 100);
      move = value - previousValue;
      todayChange += move;
    }

    if (holding.updatedAt) {
      if (
        !latestUpdatedAt ||
        Date.parse(holding.updatedAt) > Date.parse(latestUpdatedAt)
      ) {
        latestUpdatedAt = holding.updatedAt;
      }
    }

    performers.push({
      name: holding.name,
      change: changePercent ?? 0,
      move,
    });
  }

  const sortedPerformers = [...performers].sort(
    (a, b) => b.change - a.change,
  );
  const bestHolding = sortedPerformers[0] ?? { name: "—", change: 0, move: 0 };
  const worstHolding =
    sortedPerformers[sortedPerformers.length - 1] ?? bestHolding;

  const previousValue = totalValue - todayChange;
  const todayPercent =
    previousValue > 0 ? (todayChange / previousValue) * 100 : 0;

  return {
    totalValue,
    todayChange,
    todayPercent,
    bestHolding,
    worstHolding,
    latestUpdatedAt,
    holdingCount: holdings.length,
  };
}
