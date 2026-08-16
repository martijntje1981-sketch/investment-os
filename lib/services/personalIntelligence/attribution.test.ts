import { describe, expect, it } from "vitest";

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  ATTRIBUTION_DISPLAY_MIN_PP,
  ATTRIBUTION_MIXED_PERIOD_NOTE,
  buildDayContributions,
  buildPersonalActionPlan,
  buildPersonalIntelligenceToday,
  buildThirtySecondsBriefingView,
  contributionsReconcileToPortfolioPercent,
  contributionPpFromMove,
  dominantMaterialDriverShare,
  formatContributionPp,
  isDisplayMaterialContribution,
  previousPortfolioValueFromPerformers,
  rankContributionsByMateriality,
  sumContributionPp,
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

describe("attribution polish", () => {
  it("keeps contribution pp formula and reconciles to portfolio day %", () => {
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
    const contributions = buildDayContributions(
      daily.performers,
      weightMapFromValuedPositions(valuedPositions),
    );

    expect(previousPortfolioValueFromPerformers(daily.performers)).toBeGreaterThan(
      0,
    );
    expect(
      contributionsReconcileToPortfolioPercent({
        contributions,
        todayPercent: daily.todayPercent,
        hasDailyData: daily.hasDailyData,
      }),
    ).toBe(true);
    expect(sumContributionPp(contributions)).toBeCloseTo(daily.todayPercent, 5);
  });

  it("does not invent contribution pp when previous value is missing", () => {
    expect(contributionPpFromMove(100, null)).toBeNull();
    expect(contributionPpFromMove(100, 0)).toBeNull();
    expect(contributionPpFromMove(Number.NaN, 10_000)).toBeNull();
  });

  it("formats signed positive and negative contributions without false precision", () => {
    expect(formatContributionPp(0.52)).toBe("+0.5 pp");
    expect(formatContributionPp(-0.08)).toBe("-0.1 pp");
    expect(formatContributionPp(0)).toBe("0.0 pp");
  });

  it("hides tiny noise below the display threshold", () => {
    const row = {
      symbol: "AAA",
      name: "AAA",
      move: 1,
      changePercent: 0.01,
      contributionPp: ATTRIBUTION_DISPLAY_MIN_PP - 0.01,
      weightPercent: 10,
    };
    expect(isDisplayMaterialContribution(row)).toBe(false);

    const pi = buildPersonalIntelligenceToday({
      daily: summarizeDailyPerformance([
        holding({
          symbol: "AAA",
          quantity: 10,
          currentPrice: 100.05,
          previousClose: 100,
          changePercent: 0.05,
        }),
      ]),
      intelligence: quietIntelligence(),
      holdingsWeights: [{ symbol: "AAA", name: "AAA", weightPercent: 100 }],
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(view.drivers).toEqual([]);
  });

  it("shows mixed positive and negative material drivers", () => {
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
        symbol: "AIQ",
        name: "AI ETF",
        quantity: 40,
        currentPrice: 102,
        previousClose: 100,
        changePercent: 2,
      }),
      holding({
        symbol: "GOLD",
        name: "Gold ETC",
        quantity: 80,
        currentPrice: 95,
        previousClose: 100,
        changePercent: -5,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      intelligence: quietIntelligence(),
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(view.drivers.some((row) => row.tone === "positive")).toBe(true);
    expect(view.drivers.some((row) => row.tone === "negative")).toBe(true);
    expect(view.drivers.filter((row) => row.tone === "positive").length).toBeLessThanOrEqual(
      2,
    );
    expect(view.drivers.filter((row) => row.tone === "negative").length).toBeLessThanOrEqual(
      1,
    );
  });

  it("surfaces mixed equity/crypto periods only when both appear with drivers", () => {
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
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      intelligence: quietIntelligence(),
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(view.drivers.length).toBeGreaterThan(0);
    expect(view.periodNote).toBe(ATTRIBUTION_MIXED_PERIOD_NOTE);
    expect(view.drivers.some((row) => row.periodLabel)).toBe(true);
  });

  it("does not show period labels when periods are homogeneous", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "World ETF",
        quantity: 100,
        currentPrice: 105,
        previousClose: 100,
        changePercent: 5,
      }),
      holding({
        symbol: "IWDA",
        name: "World Acc",
        quantity: 50,
        currentPrice: 98,
        previousClose: 100,
        changePercent: -2,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    const pi = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      intelligence: quietIntelligence(),
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(view.periodNote).toBeNull();
    expect(view.drivers.every((row) => row.periodLabel == null)).toBe(true);
  });

  it("computes dominant driver share internally without exposing it in the briefing", () => {
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
        symbol: "VWCE",
        name: "World ETF",
        quantity: 10,
        currentPrice: 100.2,
        previousClose: 100,
        changePercent: 0.2,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const contributions = rankContributionsByMateriality(
      buildDayContributions(daily.performers),
    );
    const dominant = dominantMaterialDriverShare(contributions);
    expect(dominant).not.toBeNull();
    expect(dominant!.shareOfMaterialAbs).toBeGreaterThan(0.5);

    const pi = buildPersonalIntelligenceToday({
      daily,
      intelligence: quietIntelligence(),
      holdingsWeights: [
        { symbol: "BTC", name: "Bitcoin", weightPercent: 90 },
        { symbol: "VWCE", name: "World ETF", weightPercent: 10 },
      ],
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(
      view.drivers.every(
        (row) => !/% of today/i.test(row.contributionLabel) && row.name,
      ),
    ).toBe(true);
    const plan = buildPersonalActionPlan(pi);
    const understand = plan.items.find((item) => item.category === "understand");
    expect(understand?.headline).toMatch(/accounts for most of today’s move|drove most of today’s portfolio move/i);
    expect(understand?.detail).not.toMatch(/\b55%\b|\b40%\b|too concentrated|dangerous/i);
  });

  it("surfaces incomplete coverage without inventing contributions", () => {
    const pi = buildPersonalIntelligenceToday({
      daily: summarizeDailyPerformance([
        holding({
          symbol: "VWCE",
          quantity: 100,
          currentPrice: 105,
          previousClose: 100,
          changePercent: 5,
        }),
      ]),
      intelligence: quietIntelligence(),
    });
    const withGap = {
      ...pi,
      portfolioMove: pi.portfolioMove
        ? {
            ...pi.portfolioMove,
            coverageComplete: false,
            validPerformanceCount: 1,
            eligibleMarketHoldingCount: 3,
          }
        : null,
    };
    const view = buildThirtySecondsBriefingView(withGap);
    expect(view.coverageNote).toMatch(/1 of 3 market holdings/i);
  });

  it("keeps concentration Review wording non-advisory", () => {
    const pi = buildPersonalIntelligenceToday({
      daily: summarizeDailyPerformance([
        holding({
          symbol: "AAA",
          quantity: 10,
          currentPrice: 100.05,
          previousClose: 100,
          changePercent: 0.05,
        }),
        holding({
          symbol: "BBB",
          quantity: 1,
          currentPrice: 10,
          previousClose: 10,
          changePercent: 0,
        }),
      ]),
      holdingsWeights: [
        { symbol: "AAA", name: "AAA", weightPercent: 85 },
        { symbol: "BBB", name: "BBB", weightPercent: 15 },
      ],
      intelligence: quietIntelligence(),
    });
    const plan = buildPersonalActionPlan(pi);
    const review = plan.items.find(
      (item) => item.id === "action-review-concentration",
    );
    expect(review).toBeTruthy();
    expect(review?.headline).toMatch(/represents \d+% of your portfolio/i);
    expect(review?.detail).toMatch(/portfolio structure you intended/i);
    expect(review?.detail).not.toMatch(/too concentrated|objectively|should sell|rebalance/i);
  });

  it("cash without a daily move does not invent a driver", () => {
    const holdings = [
      holding({
        symbol: "EUR",
        name: "Euro",
        assetType: "cash",
        quantity: 5_000,
        currentPrice: 1,
        purchasePrice: 1,
      }),
      holding({
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 100.05,
        previousClose: 100,
        changePercent: 0.05,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const contributions = buildDayContributions(daily.performers);
    expect(contributions.every((row) => row.symbol !== "EUR" || row.move === 0)).toBe(
      true,
    );
    const pi = buildPersonalIntelligenceToday({
      daily,
      intelligence: quietIntelligence(),
      holdingsWeights: [
        { symbol: "EUR", name: "Euro", weightPercent: 80 },
        { symbol: "VWCE", name: "VWCE", weightPercent: 20 },
      ],
    });
    expect(buildThirtySecondsBriefingView(pi).drivers).toEqual([]);
  });
});
