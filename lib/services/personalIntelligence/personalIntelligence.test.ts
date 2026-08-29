import { describe, expect, it } from "vitest";

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  buildDayContributions,
  buildPersonalIntelligenceToday,
  contributionPpFromMove,
  previousPortfolioValueFromPerformers,
  rankContributionsByMateriality,
  weightMapFromValuedPositions,
} from "@/lib/services/personalIntelligence";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
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

function quietIntelligence(
  overrides: Partial<InvestmentIntelligence> = {},
): InvestmentIntelligence {
  return {
    portfolioStatus: "Stable",
    portfolioSummary: "No material developments were detected.",
    todayMatters: [],
    holdingInsights: { positive: [], neutral: [], negative: [] },
    macroHighlights: [],
    mustWatch: null,
    keyRisks: [],
    opportunities: [],
    quietMarket: true,
    generatedAt: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("contributionPpFromMove", () => {
  it("returns portfolio percentage points from move and previous value", () => {
    expect(contributionPpFromMove(80, 10_000)).toBeCloseTo(0.8, 5);
    expect(contributionPpFromMove(-50, 10_000)).toBeCloseTo(-0.5, 5);
  });

  it("returns null when previous value is missing or invalid", () => {
    expect(contributionPpFromMove(80, null)).toBeNull();
    expect(contributionPpFromMove(80, 0)).toBeNull();
  });
});

describe("buildDayContributions", () => {
  it("attributes day move in percentage points using existing daily performers", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_800,
        change24hPercent: 1.6,
      }),
      holding({
        symbol: "VWCE",
        name: "World ETF",
        quantity: 100,
        currentPrice: 100,
        previousClose: 99,
        changePercent: 1.010101,
      }),
      holding({
        symbol: "GOLD",
        name: "Gold ETC",
        quantity: 50,
        currentPrice: 98,
        previousClose: 100,
        changePercent: -2,
      }),
    ];

    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const weights = weightMapFromValuedPositions(valuedPositions);
    const contributions = rankContributionsByMateriality(
      buildDayContributions(daily.performers, weights),
    );

    const previous = previousPortfolioValueFromPerformers(daily.performers);
    expect(previous).not.toBeNull();
    expect(contributions.length).toBeGreaterThanOrEqual(2);

    const btc = contributions.find((row) => row.symbol === "BTC");
    expect(btc?.contributionPp).not.toBeNull();
    expect(btc!.contributionPp!).toBeGreaterThan(0);

    const sumPp = contributions.reduce(
      (sum, row) => sum + (row.contributionPp ?? 0),
      0,
    );
    expect(sumPp).toBeCloseTo(daily.todayPercent, 5);
  });
});

describe("buildPersonalIntelligenceToday", () => {
  it("returns nothing_requires_attention when markets are quiet and moves are immaterial", () => {
    const holdings = [
      holding({
        symbol: "AAA",
        quantity: 10,
        currentPrice: 100.05,
        previousClose: 100,
        changePercent: 0.05,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const result = buildPersonalIntelligenceToday({
      daily,
      intelligence: quietIntelligence(),
      holdingsWeights: [{ symbol: "AAA", name: "AAA", weightPercent: 100 }],
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    expect(result.version).toBe("pi-today-v1");
    expect(result.attention).toBe("nothing_requires_attention");
    expect(result.headline).toBe("Nothing requires your attention today.");
    expect(result.attentionItems).toEqual([]);
  });

  it("surfaces material contributors without inventing news", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 2,
        currentPrice: 55_000,
        change24hPercent: 4,
      }),
      holding({
        symbol: "CASH",
        name: "Euro",
        assetType: "cash",
        quantity: 1_000,
        currentPrice: 1,
        purchasePrice: 1,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const result = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      intelligence: quietIntelligence(),
    });

    expect(result.portfolioMove?.hasDailyData).toBe(true);
    expect(result.topContributors[0]?.symbol).toBe("BTC");
    expect(result.topContributors[0]?.contributionPp).not.toBeNull();
    expect(result.news?.quietMarket).toBe(true);
    expect(
      result.attentionItems.every((item) => item.id !== "must-watch"),
    ).toBe(true);
  });

  it("elevates attention when must-watch news exists", () => {
    const result = buildPersonalIntelligenceToday({
      daily: null,
      intelligence: quietIntelligence({
        quietMarket: false,
        portfolioStatus: "Elevated",
        mustWatch: {
          type: "article",
          itemId: "n1",
          title: "Holding-related development",
          sourceName: "Example",
          canonicalUrl: "https://example.com",
          reason: "Mentions a portfolio symbol.",
        },
        holdingInsights: {
          positive: [],
          neutral: [],
          negative: ["BTC"],
        },
      }),
    });

    expect(result.attention).toBe("elevated");
    expect(result.attentionItems.some((item) => item.id === "must-watch")).toBe(
      true,
    );
    expect(result.dataNotes).toContain(
      "Daily portfolio performance data is not available.",
    );
  });

  it("does not fabricate contributors when daily data is missing", () => {
    const result = buildPersonalIntelligenceToday({
      daily: null,
      intelligence: quietIntelligence(),
    });
    expect(result.topContributors).toEqual([]);
    expect(result.topDetractors).toEqual([]);
    expect(result.portfolioMove).toBeNull();
    expect(result.attention).toBe("nothing_requires_attention");
  });
});
