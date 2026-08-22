import { describe, expect, it } from "vitest";

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  ATTRIBUTION_MIXED_PERIOD_NOTE,
  buildPersonalIntelligenceToday,
  buildThirtySecondsBriefingView,
  selectThirtySecondsAttention,
  selectThirtySecondsDrivers,
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

describe("thirtySecondsBriefing", () => {
  it("formats a positive day with top contributors in pp", () => {
    const pi = intelligenceFromHoldings([
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
    ]);

    const view = buildThirtySecondsBriefingView(pi);
    expect(view.moveSummary).toBeNull();
    expect(view.drivers.length).toBeGreaterThan(0);
    expect(view.drivers.every((row) => /pp$/.test(row.contributionLabel))).toBe(
      true,
    );
    expect(view.drivers[0]?.contributionLabel.startsWith("+")).toBe(true);
    // Mobile-safe: labels stay short (no long prose in driver rows).
    expect(view.drivers.every((row) => row.name.length < 40)).toBe(true);
    expect(view.drivers.every((row) => row.contributionLabel.length <= 12)).toBe(
      true,
    );
  });

  it("includes a meaningful detractor on a negative / mixed day", () => {
    const pi = intelligenceFromHoldings([
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
    ]);

    const drivers = selectThirtySecondsDrivers(pi);
    const positives = drivers.filter((row) => row.tone === "positive");
    const negatives = drivers.filter((row) => row.tone === "negative");

    expect(positives.length).toBeGreaterThanOrEqual(1);
    expect(positives.length).toBeLessThanOrEqual(2);
    expect(negatives.length).toBeLessThanOrEqual(1);
    expect(negatives[0]?.name).toMatch(/Gold/i);
    expect(negatives[0]?.contributionLabel.startsWith("-")).toBe(true);
  });

  it("shows quiet success state without inventing attention items", () => {
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

    const view = buildThirtySecondsBriefingView(pi);
    expect(view.isQuiet).toBe(true);
    expect(view.headline).toBe("Nothing requires your attention today.");
    expect(view.attentionItems).toEqual([]);
    expect(view.supportingQuietLine).toMatch(/normal daily range/i);
    expect(view.moveSummary).toBeNull();
  });

  it("surfaces attention state with news and does not duplicate driver symbols", () => {
    const pi = intelligenceFromHoldings(
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
    );

    const view = buildThirtySecondsBriefingView(pi);
    expect(view.isQuiet).toBe(false);
    expect(view.headline).not.toMatch(/^Portfolio /);
    expect(view.attentionItems.length).toBeGreaterThan(0);
    expect(view.attentionItems.length).toBeLessThanOrEqual(2);
    expect(view.attentionItems.some((item) => item.id === "must-watch")).toBe(
      true,
    );
    expect(
      view.attentionItems.every((item) => item.id !== "contributor-BTC"),
    ).toBe(true);
  });

  it("handles missing daily data without fabricating drivers", () => {
    const pi = buildPersonalIntelligenceToday({
      daily: null,
      intelligence: quietIntelligence(),
      now: new Date("2026-08-16T12:00:00.000Z"),
    });
    const view = buildThirtySecondsBriefingView(pi);
    expect(view.drivers).toEqual([]);
    expect(view.isQuiet).toBe(true);
    expect(view.supportingQuietLine).toMatch(/when daily data is available/i);
  });

  it("notes mixed equity/crypto periods subtly when both appear", () => {
    const pi = intelligenceFromHoldings([
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
    ]);

    const view = buildThirtySecondsBriefingView(pi);
    expect(view.periodNote).toBe(ATTRIBUTION_MIXED_PERIOD_NOTE);
    const periodLabels = view.drivers
      .map((row) => row.periodLabel)
      .filter(Boolean);
    expect(periodLabels.length).toBeGreaterThan(0);
  });

  it("selectThirtySecondsAttention returns empty for quiet attention", () => {
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
    expect(selectThirtySecondsAttention(pi)).toEqual([]);
  });

  it("includes goal relevance when behind schedule and caps at two items", () => {
    const pi = intelligenceFromHoldings(
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
        status: "Behind schedule",
        goalReached: false,
        currentProgressPercent: 32,
      },
    );

    const attention = selectThirtySecondsAttention(pi);
    expect(attention.length).toBeLessThanOrEqual(2);
    expect(attention.some((item) => item.id === "must-watch")).toBe(true);
    expect(attention.some((item) => item.id === "goal-status")).toBe(true);
  });
});
