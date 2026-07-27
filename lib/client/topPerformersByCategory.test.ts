import { describe, expect, it } from "vitest";

import {
  buildCategoryWinnerRelation,
  buildTopPerformersByCategory,
  formatPercentagePointGap,
  TOP_PERFORMERS_PER_CATEGORY,
} from "@/lib/client/topPerformersByCategory";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    previousClose: 100,
    changePercent: 10,
    priceDataStatus: "live",
    ...overrides,
  };
}

describe("buildTopPerformersByCategory", () => {
  it("returns at most three holdings per category", () => {
    const holdings = [
      holding({
        id: "1",
        symbol: "A",
        name: "Alpha",
        providerSymbol: "AAPL.US",
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "2",
        symbol: "B",
        name: "Beta",
        providerSymbol: "MSFT.US",
        currentPrice: 120,
        previousClose: 100,
      }),
      holding({
        id: "3",
        symbol: "C",
        name: "Gamma",
        providerSymbol: "GOOGL.US",
        currentPrice: 105,
        previousClose: 100,
      }),
      holding({
        id: "4",
        symbol: "D",
        name: "Delta",
        providerSymbol: "AMZN.US",
        currentPrice: 102,
        previousClose: 100,
      }),
    ];

    const techish = holdings.map((item, index) => ({
      ...item,
      changePercent: 20 - index,
      currentPrice: 100 + (20 - index),
      previousClose: 100,
    }));

    const result = buildTopPerformersByCategory(techish);
    expect(result.groups.length).toBeGreaterThan(0);
    for (const group of result.groups) {
      expect(group.holdings.length).toBeLessThanOrEqual(TOP_PERFORMERS_PER_CATEGORY);
    }
    const unclassifiedGroup = result.groups.find(
      (group) => group.groupId === "other_unclassified",
    );
    expect(unclassifiedGroup?.holdings).toHaveLength(3);
    expect(unclassifiedGroup?.holdings.map((item) => item.symbol)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("shows fewer than three when a category has fewer eligible holdings", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "1",
        symbol: "ONLY",
        name: "Only One",
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "2",
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        change24hPercent: 3,
        changePercent: 3,
      }),
    ]);

    const nonCrypto = result.groups.find((group) => group.groupId !== "crypto");
    expect(nonCrypto?.holdings).toHaveLength(1);
  });

  it("excludes cash and holdings without comparable performance", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "cash",
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        changePercent: 1,
      }),
      holding({
        id: "missing",
        symbol: "NOPX",
        name: "No price",
        currentPrice: 0,
        previousClose: null,
        changePercent: null,
        priceDataStatus: "unavailable",
      }),
      holding({
        id: "ok",
        symbol: "OK",
        name: "Ok Holding",
        currentPrice: 110,
        previousClose: 100,
      }),
    ]);

    const symbols = result.groups.flatMap((group) =>
      group.holdings.map((item) => item.symbol),
    );
    expect(symbols).toEqual(["OK"]);
    expect(result.overallWinner?.symbol).toBe("OK");
    expect(symbols).not.toContain("EUR");
    expect(symbols).not.toContain("NOPX");
  });

  it("keeps crypto in a separate category", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "eq",
        symbol: "VWCE",
        name: "World ETF",
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        change24hPercent: 4.5,
        changePercent: 4.5,
      }),
    ]);

    expect(result.groups.some((group) => group.groupId === "crypto")).toBe(true);
    const crypto = result.groups.find((group) => group.groupId === "crypto");
    expect(crypto?.holdings.map((item) => item.symbol)).toEqual(["BTC"]);
  });

  it("uses deterministic secondary sort for equal performance", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "2",
        symbol: "ZZZ",
        name: "Zulu",
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "1",
        symbol: "AAA",
        name: "Alpha",
        currentPrice: 110,
        previousClose: 100,
      }),
    ]);

    const group = result.groups[0];
    expect(group?.holdings.map((item) => item.symbol)).toEqual(["AAA", "ZZZ"]);
    expect(result.overallWinner?.symbol).toBe("AAA");
  });

  it("uses last-session wording when exchange-traded data is not live today", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "1",
        symbol: "VWCE",
        name: "World",
        currentPrice: 110,
        previousClose: 100,
        marketPriceUpdatedAt: "2026-07-24T16:00:00.000Z",
      }),
    ]);

    expect(result.usesLastSessionWording).toBe(true);
    expect(result.sectionPeriodLabel.toLowerCase()).not.toContain("today");
    expect(result.sectionBasisCopy).toBe(
      "Based on the last available market session",
    );
    expect(result.sectionBasisCopy.toLowerCase()).not.toContain("today");
  });

  it("selects the overall winner from the same eligible dataset as category rankings", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "eq-strong",
        symbol: "EQ1",
        name: "Equity Strong",
        currentPrice: 112,
        previousClose: 100,
      }),
      holding({
        id: "eq-weak",
        symbol: "EQ2",
        name: "Equity Weak",
        currentPrice: 101,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        change24hPercent: 5,
        changePercent: 5,
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        name: "Cash",
        assetType: "cash",
        changePercent: 99,
      }),
    ]);

    expect(result.overallWinner?.symbol).toBe("EQ1");
    expect(result.overallWinner?.changePercent).toBeCloseTo(12, 5);

    const allRankedIds = result.groups.flatMap((group) =>
      group.holdings.map((item) => item.id),
    );
    expect(allRankedIds).toContain(result.overallWinner!.id);
    expect(allRankedIds).not.toContain("cash");
  });

  it("marks the category that owns the overall winner as portfolio leader", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "leader",
        symbol: "LEAD",
        name: "Leader",
        currentPrice: 115,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        change24hPercent: 2,
        changePercent: 2,
      }),
    ]);

    expect(result.overallWinner?.id).toBe("leader");
    const leaderGroup = result.groups.find(
      (group) => group.categoryWinner.id === "leader",
    );
    expect(leaderGroup?.relationToPortfolioLeader.kind).toBe("portfolio_leader");
    expect(leaderGroup?.relationToPortfolioLeader.comparisonLabel).toBe(
      "Portfolio leader.",
    );

    const cryptoGroup = result.groups.find((group) => group.groupId === "crypto");
    expect(cryptoGroup?.relationToPortfolioLeader.kind).toBe("behind");
    expect(
      cryptoGroup?.relationToPortfolioLeader.gapPercentagePoints,
    ).toBeCloseTo(13, 5);
    expect(cryptoGroup?.relationToPortfolioLeader.comparisonLabel).toContain(
      "behind the portfolio leader",
    );
  });

  it("uses tied wording when category winner matches overall percent but loses tie-break", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "a",
        symbol: "AAA",
        name: "Alpha",
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "z",
        symbol: "ZZZ",
        name: "Zulu",
        assetType: "crypto",
        change24hPercent: 10,
        changePercent: 10,
      }),
    ]);

    // Same 10% change; AAA wins overall via symbol tie-break.
    expect(result.overallWinner?.symbol).toBe("AAA");
    const crypto = result.groups.find((group) => group.groupId === "crypto");
    expect(crypto?.relationToPortfolioLeader.kind).toBe("tied");
    expect(crypto?.relationToPortfolioLeader.comparisonLabel).toBe(
      "Tied with the portfolio leader.",
    );
    expect(crypto?.relationToPortfolioLeader.gapPercentagePoints).toBe(0);
  });

  it("formats percentage-point gaps from raw values with display-only rounding", () => {
    expect(formatPercentagePointGap(1.74)).toBe("1.7 percentage points");
    expect(formatPercentagePointGap(1)).toBe("1 percentage point");
    expect(formatPercentagePointGap(0.4)).toBe("0.4 percentage points");

    const relation = buildCategoryWinnerRelation(
      {
        id: "o",
        symbol: "O",
        name: "Overall",
        changePercent: 5.25,
        changeAmount: null,
        periodLabel: "Last session",
        periodAccessibleDescription: "",
        groupId: "diversified_equity",
        displayLabel: "Diversified equity",
      },
      {
        id: "c",
        symbol: "C",
        name: "Category",
        changePercent: 3.55,
        changeAmount: null,
        periodLabel: "Last session",
        periodAccessibleDescription: "",
        groupId: "crypto",
        displayLabel: "Crypto",
      },
    );

    expect(relation.kind).toBe("behind");
    expect(relation.gapPercentagePoints).toBeCloseTo(1.7, 5);
    expect(relation.comparisonLabel).toBe(
      "1.7 percentage points behind the portfolio leader.",
    );
  });

  it("uses today’s movement wording for crypto-only comparable sets", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        change24hPercent: 2.5,
        changePercent: 2.5,
      }),
    ]);

    expect(result.usesLastSessionWording).toBe(false);
    expect(result.sectionBasisCopy).toBe("Based on today’s movement");
  });

  it("keeps unclassified holdings in the central classifier fallback category", () => {
    const result = buildTopPerformersByCategory([
      holding({
        id: "strc",
        symbol: "STRC",
        name: "Strategy",
        providerSymbol: "STRC.AS",
        currentPrice: 110,
        previousClose: 100,
      }),
    ]);

    expect(result.classification.unclassified.map((item) => item.symbol)).toContain(
      "STRC",
    );
    expect(result.groups.some((group) => group.groupId === "other_unclassified")).toBe(
      true,
    );
  });
});
