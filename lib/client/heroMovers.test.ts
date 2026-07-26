import { describe, expect, it } from "vitest";

import {
  pickTopAndLowestMovers,
  resolveMoverChangePeriodLabel,
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
    assetType: overrides.assetType ?? "investment",
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
    priceUpdatedAt: overrides.priceUpdatedAt,
  };
}

describe("pickTopAndLowestMovers", () => {
  it("selects the highest and lowest reliable performers", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 110,
        previousClose: 100,
        changePercent: 10,
      }),
      holding({
        symbol: "BBB",
        currentPrice: 95,
        previousClose: 100,
        changePercent: -5,
      }),
      holding({
        symbol: "CCC",
        currentPrice: 102,
        previousClose: 100,
        changePercent: 2,
      }),
    ]);

    const movers = pickTopAndLowestMovers(snapshot);

    expect(movers.hasReliableMoverData).toBe(true);
    expect(movers.topMover?.holding.symbol).toBe("AAA");
    expect(movers.lowestMover?.holding.symbol).toBe("BBB");
  });

  it("uses lowest performer as lowest mover when all changes are positive", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 110,
        previousClose: 100,
        changePercent: 5,
      }),
      holding({
        symbol: "BBB",
        currentPrice: 101,
        previousClose: 100,
        changePercent: 1,
      }),
    ]);

    const movers = pickTopAndLowestMovers(snapshot);

    expect(movers.topMover?.holding.symbol).toBe("AAA");
    expect(movers.lowestMover?.holding.symbol).toBe("BBB");
  });

  it("uses least-negative performer as top mover when all changes are negative", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 98,
        previousClose: 100,
        changePercent: -2,
      }),
      holding({
        symbol: "BBB",
        currentPrice: 90,
        previousClose: 100,
        changePercent: -10,
      }),
    ]);

    const movers = pickTopAndLowestMovers(snapshot);

    expect(movers.topMover?.holding.symbol).toBe("AAA");
    expect(movers.lowestMover?.holding.symbol).toBe("BBB");
  });

  it("excludes zero-change performers but keeps non-zero movers", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 110,
        previousClose: 100,
        changePercent: 4,
      }),
      holding({ symbol: "FLAT", currentPrice: 100, previousClose: 100, changePercent: 0 }),
      holding({ symbol: "MISSING", currentPrice: 100, quantity: 10 }),
    ]);

    const movers = pickTopAndLowestMovers(snapshot);

    expect(movers.hasReliableMoverData).toBe(true);
    expect(movers.topMover?.holding.symbol).toBe("AAA");
    expect(movers.lowestMover).toBeNull();
  });

  it("labels crypto movers with 24h and equities with Last session", () => {
    expect(
      resolveMoverChangePeriodLabel(
        holding({ symbol: "BTC", assetType: "crypto" }),
      ),
    ).toBe("24h");
    expect(
      resolveMoverChangePeriodLabel(
        holding({
          symbol: "VWCE",
          marketPriceUpdatedAt: "2026-07-24",
        }),
      ),
    ).toBe("Last session · Jul 24");
    expect(
      resolveMoverChangePeriodLabel(holding({ symbol: "AAPL" })),
    ).toBe("Latest available");
  });

  it("returns movers from covered holdings when coverage is incomplete", () => {
    const snapshot = summarizeDailyPerformance([
      holding({
        symbol: "AAA",
        currentPrice: 110,
        previousClose: 100,
        changePercent: 4,
      }),
      holding({ symbol: "BBB", currentPrice: 100 }),
    ]);

    const movers = pickTopAndLowestMovers(snapshot);

    expect(movers.hasReliableMoverData).toBe(true);
    expect(movers.topMover?.holding.symbol).toBe("AAA");
  });
});
