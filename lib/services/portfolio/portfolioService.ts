import { portfolioHoldings } from "@/lib/data/portfolio";
import type { HoldingSnapshot, PortfolioSnapshot } from "@/lib/types/portfolio";

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getPortfolioSnapshot(): PortfolioSnapshot {
  const raw = portfolioHoldings.map((holding) => {
    const costBasis = holding.units * holding.averagePrice;
    const marketValue = holding.units * holding.currentPrice;
    const profitLoss = marketValue - costBasis;
    const returnPercent = costBasis === 0 ? 0 : (profitLoss / costBasis) * 100;
    const dailyChangeValue = marketValue * (holding.dailyChangePercent / 100);

    return { ...holding, costBasis, marketValue, profitLoss, returnPercent, dailyChangeValue };
  });

  const totalValue = raw.reduce((sum, item) => sum + item.marketValue, 0);
  const totalCostBasis = raw.reduce((sum, item) => sum + item.costBasis, 0);
  const dailyChangeValue = raw.reduce((sum, item) => sum + item.dailyChangeValue, 0);

  const holdings: HoldingSnapshot[] = raw
    .map((item) => ({ ...item, weightPercent: totalValue === 0 ? 0 : (item.marketValue / totalValue) * 100 }))
    .sort((a, b) => b.marketValue - a.marketValue);

  const totalProfitLoss = totalValue - totalCostBasis;

  return {
    holdings,
    totalValue: round(totalValue),
    totalCostBasis: round(totalCostBasis),
    totalProfitLoss: round(totalProfitLoss),
    totalReturnPercent: round(totalCostBasis === 0 ? 0 : (totalProfitLoss / totalCostBasis) * 100),
    dailyChangeValue: round(dailyChangeValue),
    dailyChangePercent: round(totalValue === 0 ? 0 : (dailyChangeValue / totalValue) * 100),
    largestHolding: holdings[0],
  };
}

export function getHoldingByTicker(ticker: string) {
  return getPortfolioSnapshot().holdings.find((holding) => holding.ticker.toLowerCase() === ticker.toLowerCase());
}
