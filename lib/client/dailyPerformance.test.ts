import { describe, expect, it } from "vitest";

import {
  formatDailyPerformanceCoverageMessage,
  hasValidDailyPerformance,
  pickBestAndWorstMovers,
  summarizeDailyPerformance,
} from "@/lib/client/dailyPerformance";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: "investment",
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    changeAmount: overrides.changeAmount,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

describe("summarizeDailyPerformance", () => {
  it("aggregates daily move from holdings with complete daily data", () => {
    const summary = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 110,
        previousClose: 100,
        changePercent: 10,
        quantity: 10,
      }),
      holding({
        symbol: "BBB",
        currentPrice: 95,
        previousClose: 100,
        changePercent: -5,
        quantity: 5,
      }),
    ]);

    expect(summary.hasDailyData).toBe(true);
    expect(summary.performanceCoverageComplete).toBe(true);
    expect(summary.validPerformanceCount).toBe(2);
    expect(summary.todayChange).toBeCloseTo(75, 1);
    expect(summary.bestPerformer?.holding.symbol).toBe("AAA");
    expect(summary.worstPerformer?.holding.symbol).toBe("BBB");
  });

  it("reports no daily data when changePercent is missing", () => {
    const summary = summarizeDailyPerformance([
      holding({ symbol: "AAA", currentPrice: 110, quantity: 10 }),
    ]);

    expect(summary.hasDailyData).toBe(false);
    expect(summary.performanceCoverageComplete).toBe(false);
    expect(summary.todayChange).toBe(0);
    expect(summary.bestPerformer).toBeNull();
  });

  it("requires previousClose for valid daily performance", () => {
    expect(
      hasValidDailyPerformance(
        holding({ symbol: "AAA", currentPrice: 110, changePercent: 2 }),
      ),
    ).toBe(false);

    expect(
      hasValidDailyPerformance(
        holding({
          symbol: "AAA",
          currentPrice: 110,
          previousClose: 108,
          changePercent: 2,
        }),
      ),
    ).toBe(true);
  });

  it("tracks partial coverage across market holdings", () => {
    const summary = summarizeDailyPerformance([
      holding({
        symbol: "STRC",
        currentPrice: 16.04,
        previousClose: 15.83,
        changePercent: -2.2,
      }),
      holding({ symbol: "VWCE", currentPrice: 128, quantity: 10 }),
      holding({ symbol: "IB1T", currentPrice: 5.2, quantity: 100 }),
    ]);

    expect(summary.validPerformanceCount).toBe(1);
    expect(summary.eligibleMarketHoldingCount).toBe(3);
    expect(summary.performanceCoverageComplete).toBe(false);
    expect(summary.performers[0]?.changePercent).toBeCloseTo(1.32, 1);
  });

  it("excludes cash from eligible market holding count", () => {
    const summary = summarizeDailyPerformance([
      holding({
        symbol: "VWCE",
        currentPrice: 128,
        previousClose: 127,
        changePercent: 0.8,
      }),
      {
        ...holding({ symbol: "EUR", assetType: "cash", currentPrice: 1 }),
        assetType: "cash",
      },
    ]);

    expect(summary.eligibleMarketHoldingCount).toBe(1);
    expect(summary.performanceCoverageComplete).toBe(true);
  });
});

describe("pickBestAndWorstMovers", () => {
  it("returns null movers when coverage is incomplete", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "STRC",
        currentPrice: 16.04,
        previousClose: 15.83,
        changePercent: -2.2,
      }),
      holding({ symbol: "VWCE", currentPrice: 128 }),
    ]);

    expect(pickBestAndWorstMovers(snapshot)).toEqual({
      bestMover: null,
      worstMover: null,
    });
  });
});
