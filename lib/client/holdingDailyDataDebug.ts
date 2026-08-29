import { hasValidDailyPerformance } from "@/lib/client/dailyPerformance";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/** Temporary production diagnostics for daily performance gaps. */
export function logHoldingDailyData(
  holdings: StoredPortfolioHolding[],
  context = "portfolio",
): void {
  if (typeof window === "undefined") {
    return;
  }

  console.group(`[holding daily data] ${context}`);

  for (const holding of holdings) {
    if (holding.assetType === "cash") {
      continue;
    }

    console.log("[holding daily data]", {
      name: holding.name,
      symbol: holding.symbol,
      providerSymbol: holding.providerSymbol,
      currentPrice: holding.currentPrice,
      previousClose: holding.previousClose ?? null,
      change: holding.changeAmount ?? null,
      changePercent: holding.changePercent ?? null,
      updatedAt: holding.marketPriceUpdatedAt ?? holding.updatedAt ?? null,
      dataStatus: holding.priceDataStatus ?? null,
      hasValidDailyPerformance: hasValidDailyPerformance(holding),
    });
  }

  console.groupEnd();
}
