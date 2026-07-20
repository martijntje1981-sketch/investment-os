import {
  buildPortfolioAnalysis,
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function isValidMarketPrice(price: unknown): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

export function resolveEffectiveMarketPrice(
  holding: StoredPortfolioHolding,
): number | null {
  if (holding.assetType === "cash") {
    return isValidMarketPrice(holding.currentPrice) ? holding.currentPrice : 1;
  }

  return isValidMarketPrice(holding.currentPrice) ? holding.currentPrice : null;
}

export function mergeRemoteMarketPrice(
  remoteHolding: StoredPortfolioHolding,
  localPrice?: number,
): number {
  if (remoteHolding.assetType === "cash") {
    return 1;
  }

  if (isValidMarketPrice(remoteHolding.currentPrice)) {
    return remoteHolding.currentPrice;
  }

  if (isValidMarketPrice(localPrice)) {
    return localPrice;
  }

  return 0;
}

export type PortfolioPerformanceSnapshot = {
  totalValue: number;
  investedCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  cashValue: number;
  canShowPerformance: boolean;
  hasUnvaluedInvestments: boolean;
  investmentCount: number;
};

export function calculateValuedInvestedCapital(
  holdings: StoredPortfolioHolding[],
): number {
  return holdings.reduce((total, holding) => {
    if (getHoldingMarketValue(holding) === null) {
      return total;
    }

    if (
      !Number.isFinite(holding.quantity) ||
      !Number.isFinite(holding.purchasePrice)
    ) {
      return total;
    }

    return total + holding.quantity * holding.purchasePrice;
  }, 0);
}

export function buildPortfolioPerformance(
  holdings: StoredPortfolioHolding[],
): PortfolioPerformanceSnapshot {
  const analysis = buildPortfolioAnalysis(holdings);
  const investedCapital = calculateValuedInvestedCapital(holdings);
  const totalReturn = analysis.totalValue - investedCapital;
  const totalReturnPercent =
    investedCapital > 0 ? (totalReturn / investedCapital) * 100 : 0;

  const cashValue = analysis.valuedPositions
    .filter((position) => position.holding.assetType === "cash")
    .reduce((sum, position) => sum + position.value, 0);

  const investmentHoldings = holdings.filter(
    (holding) => holding.assetType !== "cash" && holding.quantity > 0,
  );
  const hasUnvaluedInvestments = analysis.unvaluedHoldings.some(
    (holding) => holding.assetType !== "cash" && holding.quantity > 0,
  );

  const canShowPerformance =
    investmentHoldings.length === 0 ||
    (investedCapital > 0 && !hasUnvaluedInvestments);

  return {
    totalValue: analysis.totalValue,
    investedCapital,
    totalReturn,
    totalReturnPercent,
    cashValue,
    canShowPerformance,
    hasUnvaluedInvestments,
    investmentCount: investmentHoldings.length,
  };
}
