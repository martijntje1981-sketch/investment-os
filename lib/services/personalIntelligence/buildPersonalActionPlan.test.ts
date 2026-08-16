import { describe, expect, it } from "vitest";

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  ACTION_PLAN_MAX_ITEMS,
  ACTION_PLAN_PROHIBITED_PATTERNS,
  buildLookAheadCandidate,
  buildPersonalActionPlan,
  buildPersonalIntelligenceToday,
  buildThirtySecondsBriefingView,
} from "@/lib/services/personalIntelligence";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
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

function intelligenceFromHoldings(
  holdings: StoredPortfolioHolding[],
  intelligence: InvestmentIntelligence = quietIntelligence(),
  goals: PersonalIntelligenceToday["goals"] = null,
): PersonalIntelligenceToday {
  const daily = summarizeDailyPerformance(holdings);
  const { valuedPositions } = buildValuedPositions(holdings);
  return buildPersonalIntelligenceToday({
    daily,
    holdingsWeights: valuedPositions.map((position) => ({
      symbol: position.holding.symbol,
      name: position.holding.name,
      weightPercent: position.weightPercent,
    })),
    intelligence,
    goals,
    now: new Date("2026-08-16T12:00:00.000Z"),
  });
}

function allCopy(plan: ReturnType<typeof buildPersonalActionPlan>): string {
  return plan.items
    .map(
      (item) =>
        `${item.categoryLabel} ${item.headline} ${item.detail} ${item.hrefLabel ?? ""}`,
    )
    .join("\n");
}

describe("buildPersonalActionPlan", () => {
  it("returns a quiet NO ACTION REQUIRED state", () => {
    const pi = intelligenceFromHoldings(
      [
        holding({
          symbol: "AAA",
          quantity: 10,
          currentPrice: 100.05,
          previousClose: 100,
          changePercent: 0.05,
        }),
      ],
      quietIntelligence(),
    );

    const plan = buildPersonalActionPlan(pi);
    expect(plan.isNoAction).toBe(true);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.category).toBe("no_action_required");
    expect(plan.items[0]?.headline).toMatch(/nothing materially requires/i);
  });

  it("creates an UNDERSTAND item for concentrated portfolio drivers", () => {
    const pi = intelligenceFromHoldings([
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
    ]);

    const plan = buildPersonalActionPlan(pi);
    expect(plan.isNoAction).toBe(false);
    expect(plan.items.some((item) => item.category === "understand")).toBe(
      true,
    );
    const understand = plan.items.find((item) => item.category === "understand");
    expect(understand?.headline).not.toMatch(/\+\d+\.\d+\s*pp/i);
    expect(understand?.detail).not.toMatch(/top contributor/i);
  });

  it("creates a WATCH item from material portfolio-relevant news", () => {
    const pi = intelligenceFromHoldings(
      [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 50_000,
          change24hPercent: 0.2,
        }),
      ],
      quietIntelligence({
        quietMarket: false,
        portfolioStatus: "Elevated",
        mustWatch: {
          type: "article",
          itemId: "n1",
          title: "Unique headline about a holding event",
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
    );

    const plan = buildPersonalActionPlan(pi);
    const watch = plan.items.find((item) => item.category === "watch");
    expect(watch).toBeTruthy();
    expect(watch?.headline).toBe("Unique headline about a holding event");
    expect(watch?.entitySymbol).toBe("BTC");
    expect(watch?.href).toContain("portfolio-news");
  });

  it("keeps generic WATCH copy when the verified title is missing", () => {
    const pi = intelligenceFromHoldings(
      [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 50_000,
          change24hPercent: 0.2,
        }),
      ],
      quietIntelligence({
        quietMarket: false,
        portfolioStatus: "Elevated",
        mustWatch: {
          type: "article",
          itemId: "n1",
          title: "   ",
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
    );

    const watch = buildPersonalActionPlan(pi).items.find(
      (item) => item.category === "watch",
    );
    expect(watch?.headline).toBe(
      "A portfolio-linked development is worth monitoring",
    );
  });

  it("creates a GOAL item when the goal model is behind schedule", () => {
    const pi = intelligenceFromHoldings(
      [
        holding({
          symbol: "AAA",
          quantity: 10,
          currentPrice: 100.05,
          previousClose: 100,
          changePercent: 0.05,
        }),
      ],
      quietIntelligence(),
      {
        hasGoal: true,
        status: "Behind schedule",
        goalReached: false,
        currentProgressPercent: 28,
      },
    );

    const plan = buildPersonalActionPlan(pi);
    expect(plan.items.some((item) => item.category === "goal")).toBe(true);
    expect(plan.isNoAction).toBe(false);
  });

  it("does not repeat briefing contributor pp wording", () => {
    const pi = intelligenceFromHoldings([
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
        quantity: 20,
        currentPrice: 100,
        previousClose: 99.5,
        changePercent: 0.5,
      }),
    ]);

    const briefing = buildThirtySecondsBriefingView(pi);
    const plan = buildPersonalActionPlan(pi);
    const briefingLabels = briefing.drivers.map((row) => row.contributionLabel);
    const planText = allCopy(plan);

    for (const label of briefingLabels) {
      expect(planText).not.toContain(label);
    }
    expect(planText).not.toMatch(/was your top contributor/i);
  });

  it("caps the plan at three items", () => {
    const pi = intelligenceFromHoldings(
      [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 5,
          currentPrice: 60_000,
          change24hPercent: 5,
        }),
      ],
      quietIntelligence({
        quietMarket: false,
        portfolioStatus: "High Attention",
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
      {
        hasGoal: true,
        status: "Behind schedule",
        goalReached: false,
        currentProgressPercent: 20,
      },
    );

    // Force incomplete coverage note path via mutated portfolioMove.
    const withCoverageGap: PersonalIntelligenceToday = {
      ...pi,
      holdingsWeights: [
        { symbol: "BTC", name: "Bitcoin", weightPercent: 92 },
      ],
      portfolioMove: pi.portfolioMove
        ? {
            ...pi.portfolioMove,
            coverageComplete: false,
            validPerformanceCount: 1,
            eligibleMarketHoldingCount: 4,
          }
        : null,
    };

    const plan = buildPersonalActionPlan(withCoverageGap);
    expect(plan.items.length).toBeLessThanOrEqual(ACTION_PLAN_MAX_ITEMS);
    expect(plan.items.length).toBeGreaterThan(0);
  });

  it("handles missing daily and news data without inventing work", () => {
    const pi = buildPersonalIntelligenceToday({
      daily: null,
      intelligence: null,
      now: new Date("2026-08-16T12:00:00.000Z"),
    });
    const plan = buildPersonalActionPlan(pi);
    expect(plan.isNoAction).toBe(true);
    expect(plan.items[0]?.category).toBe("no_action_required");
  });

  it("omits LOOK AHEAD until a trusted source exists", () => {
    expect(buildLookAheadCandidate()).toBeNull();
  });

  it("contains no prohibited advisory wording", () => {
    const cases: PersonalIntelligenceToday[] = [
      intelligenceFromHoldings(
        [
          holding({
            symbol: "AAA",
            quantity: 10,
            currentPrice: 100.05,
            previousClose: 100,
            changePercent: 0.05,
          }),
        ],
        quietIntelligence(),
      ),
      intelligenceFromHoldings(
        [
          holding({
            symbol: "BTC",
            name: "Bitcoin",
            assetType: "crypto",
            quantity: 2,
            currentPrice: 55_000,
            change24hPercent: 4,
          }),
        ],
        quietIntelligence({
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
        {
          hasGoal: true,
          status: "Slightly behind",
          goalReached: false,
          currentProgressPercent: 40,
        },
      ),
    ];

    for (const pi of cases) {
      const text = allCopy(buildPersonalActionPlan(pi));
      for (const pattern of ACTION_PLAN_PROHIBITED_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
