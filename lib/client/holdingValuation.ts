import {
  resolveHoldingDisplayPrice,
  type HoldingDisplayPrice,
} from "@/lib/client/holdingDisplayPrice";
import {
  buildValuedPositions,
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
export {
  isEstimatedHoldingPrice,
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingDisplayPrice";

export function getHoldingCostBasis(holding: StoredPortfolioHolding): number {
  if (!Number.isFinite(holding.quantity) || holding.quantity < 0) {
    return 0;
  }

  if (!Number.isFinite(holding.purchasePrice) || holding.purchasePrice < 0) {
    return 0;
  }

  return holding.quantity * holding.purchasePrice;
}

export function getHoldingReturnValue(
  holding: StoredPortfolioHolding,
): number | null {
  const marketValue = getHoldingMarketValue(holding);
  if (marketValue === null) {
    return null;
  }

  return marketValue - getHoldingCostBasis(holding);
}

export function getHoldingReturnPercent(
  holding: StoredPortfolioHolding,
): number | null {
  const costBasis = getHoldingCostBasis(holding);
  const returnValue = getHoldingReturnValue(holding);

  if (returnValue === null || costBasis <= 0) {
    return null;
  }

  return (returnValue / costBasis) * 100;
}

export function getPortfolioTotalMarketValue(
  holdings: StoredPortfolioHolding[],
): number {
  return buildValuedPositions(holdings).totalValue;
}

export function getHoldingPortfolioWeightPercent(
  holding: StoredPortfolioHolding,
  holdings: StoredPortfolioHolding[],
): number | null {
  const marketValue = getHoldingMarketValue(holding);
  if (marketValue === null || marketValue <= 0) {
    return null;
  }

  const totalValue = getPortfolioTotalMarketValue(holdings);
  if (totalValue <= 0) {
    return null;
  }

  return (marketValue / totalValue) * 100;
}

export type HoldingValuation = {
  marketValue: number | null;
  displayPrice: HoldingDisplayPrice;
  costBasis: number;
  returnValue: number | null;
  returnPercent: number | null;
  portfolioWeightPercent: number | null;
  portfolioTotalValue: number;
};

export function buildHoldingValuation(
  holding: StoredPortfolioHolding,
  holdings: StoredPortfolioHolding[],
): HoldingValuation {
  const portfolioTotalValue = getPortfolioTotalMarketValue(holdings);

  return {
    marketValue: getHoldingMarketValue(holding),
    displayPrice: resolveHoldingDisplayPrice(holding),
    costBasis: getHoldingCostBasis(holding),
    returnValue: getHoldingReturnValue(holding),
    returnPercent: getHoldingReturnPercent(holding),
    portfolioWeightPercent: getHoldingPortfolioWeightPercent(holding, holdings),
    portfolioTotalValue,
  };
}
