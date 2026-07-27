import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  pickTopAndLowestMovers,
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
  };
}

describe("Dashboard hero movers responsive layout", () => {
  it("renders two movers in a shared responsive grid when both exist", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );

    expect(source).toContain("grid-cols-2");
    expect(source).toContain("Top mover");
    expect(source).toContain("Weakest mover");
  });

  it("keeps a single available mover tile when the second mover is missing", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );

    expect(source).toContain("No negative mover");
    expect(source).toContain("Weakest mover");
  });

  it("keeps crypto 24-hour period labels from mover selection logic", () => {
    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          changePercent: 2.4,
          change24hPercent: 2.4,
        }),
        holding({
          symbol: "ETH",
          name: "Ethereum",
          assetType: "crypto",
          changePercent: -1.1,
          change24hPercent: -1.1,
        }),
      ]),
    );

    expect(movers.topMover?.changePeriodLabel).toBe("24h");
    expect(movers.lowestMover?.changePeriodLabel).toBe("24h");
  });

  it("keeps equity previous-close period labels from mover selection logic", () => {
    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          assetType: "investment",
          currentPrice: 101.2,
          previousClose: 100,
          changePercent: 1.2,
        }),
        holding({
          symbol: "AAPL",
          name: "Apple Inc.",
          assetType: "investment",
          currentPrice: 99.2,
          previousClose: 100,
          changePercent: -0.8,
        }),
      ]),
    );

    expect(movers.topMover?.changePeriodLabel).toBe("Last session");
    expect(movers.lowestMover?.changePeriodLabel).toBe("Last session");
  });

  it("does not fabricate movers when change data is unavailable", () => {
    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "VWCE",
          changePercent: 0,
          currentPrice: undefined,
          previousClose: undefined,
        }),
      ]),
    );

    expect(movers.hasReliableMoverData).toBe(false);
    expect(movers.topMover).toBeNull();
    expect(movers.lowestMover).toBeNull();
  });

  it("does not change which holdings are selected as top and lowest movers", () => {
    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "BTC",
          assetType: "crypto",
          changePercent: 3.5,
          change24hPercent: 3.5,
        }),
        holding({
          symbol: "ETH",
          assetType: "crypto",
          changePercent: -2.1,
          change24hPercent: -2.1,
        }),
      ]),
    );

    expect(movers.topMover?.holding.symbol).toBe("BTC");
    expect(movers.lowestMover?.holding.symbol).toBe("ETH");
  });

  it("shows only one mover tile for a single-holding portfolio without fabricating a second holding", () => {
    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "SOL",
          assetType: "crypto",
          changePercent: 4.2,
          change24hPercent: 4.2,
        }),
      ]),
    );

    expect(movers.topMover?.holding.symbol).toBe("SOL");
    expect(movers.lowestMover).toBeNull();
    expect(movers.hasReliableMoverData).toBe(true);
  });

  it("keeps percentage and period labels visible in compact mover tiles", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );

    expect(source).toContain("changePeriodLabel");
    expect(source).toContain("signedPercent");
    expect(source).toContain("text-xl font-black");
    expect(source).toContain("text-base font-bold");
  });
});
