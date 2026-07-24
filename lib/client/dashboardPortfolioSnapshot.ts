import { buildDashboardSummary, type DashboardSummary } from "@/lib/client/dashboardSummary";
import { logLivePriceRefreshTrace } from "@/lib/client/marketDataRefreshTrace";
import {
  computeHoldingDayMove,
  resolveHoldingChangePercent,
} from "@/lib/client/dailyPerformance";
import {
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import {
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingDisplayPrice";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type DashboardHoldingPriceStatus = "available" | "unavailable";
export type DashboardHoldingChangeStatus = "available" | "unavailable";
export type DashboardHoldingPriceQuality =
  | "live"
  | "estimated"
  | "stale"
  | "unavailable";

export type DashboardHoldingRow = {
  id: string;
  name: string;
  symbol: string;
  assetType: StoredPortfolioHolding["assetType"];
  currentValue: number | null;
  portfolioWeightPercent: number | null;
  dailyChangeAmount: number | null;
  dailyChangePercent: number | null;
  priceStatus: DashboardHoldingPriceStatus;
  changeStatus: DashboardHoldingChangeStatus;
  priceQuality: DashboardHoldingPriceQuality;
  lastUpdatedAt: string | null;
  isStale: boolean;
};

export type DashboardPortfolioSnapshot = DashboardSummary & {
  investedAssetsValue: number;
  cashValue: number;
  isStale: boolean;
  marketHoldings: DashboardHoldingRow[];
  goalTargetYear: number | null;
};

function buildDashboardHoldingRow(
  holding: StoredPortfolioHolding,
  totalValue: number,
): DashboardHoldingRow | null {
  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
    return null;
  }

  if (holding.assetType === "cash") {
    const currentValue = getHoldingMarketValue(holding);

    return {
      id: holding.id,
      name: holding.name || `${holding.symbol} Cash`,
      symbol: holding.symbol,
      assetType: "cash",
      currentValue,
      portfolioWeightPercent:
        totalValue > 0 && currentValue !== null
          ? (currentValue / totalValue) * 100
          : null,
      dailyChangeAmount: null,
      dailyChangePercent: null,
      priceStatus: currentValue !== null ? "available" : "unavailable",
      changeStatus: "available",
      priceQuality: "live",
      lastUpdatedAt: null,
      isStale: false,
    };
  }

  const currentValue = getHoldingMarketValue(holding);
  const displayPrice = resolveHoldingDisplayPrice(holding);
  const dailyChangePercent = resolveHoldingChangePercent(holding);
  const dailyChangeAmount =
    currentValue !== null && dailyChangePercent !== null
      ? computeHoldingDayMove(holding, currentValue)
      : null;
  const priceQuality: DashboardHoldingPriceQuality =
    displayPrice.source === "unavailable"
      ? "unavailable"
      : displayPrice.source === "estimated"
        ? "estimated"
        : holding.priceDataStatus === "stale"
          ? "stale"
          : "live";

  return {
    id: holding.id,
    name: holding.name || holding.symbol,
    symbol: holding.symbol,
    assetType: holding.assetType,
    currentValue,
    portfolioWeightPercent:
      totalValue > 0 && currentValue !== null
        ? (currentValue / totalValue) * 100
        : null,
    dailyChangeAmount,
    dailyChangePercent,
    priceStatus: currentValue !== null ? "available" : "unavailable",
    changeStatus:
      currentValue !== null && dailyChangePercent !== null
        ? "available"
        : "unavailable",
    priceQuality,
    lastUpdatedAt: holding.marketPriceUpdatedAt ?? holding.updatedAt ?? null,
    isStale: holding.priceDataStatus === "stale",
  };
}

export function buildDashboardPortfolioSnapshot(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  hasSavedGoal: boolean,
): DashboardPortfolioSnapshot {
  const summary = buildDashboardSummary(holdings, goal, hasSavedGoal);
  const performance = buildPortfolioPerformance(holdings);
  const totalValue = summary.portfolioValue;

  const marketHoldings = holdings
    .map((holding) => buildDashboardHoldingRow(holding, totalValue))
    .filter((row): row is DashboardHoldingRow => row !== null)
    .sort((left, right) => {
      const leftValue = left.currentValue ?? 0;
      const rightValue = right.currentValue ?? 0;
      return rightValue - leftValue;
    });

  const isStale = holdings.some(
    (holding) =>
      holding.assetType !== "cash" && holding.priceDataStatus === "stale",
  );

  logLivePriceRefreshTrace("dashboard_snapshot", {
    isStale,
    lastUpdatedAt: summary.lastUpdatedAt,
    holdingCount: summary.holdingCount,
    hasDailyData: summary.hasDailyData,
  });

  return {
    ...summary,
    investedAssetsValue: Math.max(0, summary.portfolioValue - performance.cashValue),
    cashValue: performance.cashValue,
    isStale,
    marketHoldings,
    goalTargetYear: goal && hasSavedGoal ? goal.targetYear : null,
  };
}
