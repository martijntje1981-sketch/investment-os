import { describe, expect, it } from "vitest";

import {
  buildTopPerformersByCategory,
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

    // Force same category via assetType investment without research → diversified or unclassified
    // Use crypto vs investment to guarantee separate buckets and multiple in unclassified/diversified.
    const techish = holdings.map((item, index) => ({
      ...item,
      // Without research profiles these land in other_unclassified together.
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
    expect(
      result.sectionPeriodLabel.toLowerCase().includes("session") ||
        result.sectionPeriodLabel.toLowerCase().includes("latest"),
    ).toBe(true);
  });
});
