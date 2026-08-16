/**
 * Focused Daily / Weekly Portfolio Score tests (no paid APIs).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildCombinedPulseSummary,
  buildDailyPortfolioScore,
  buildMonthlyPortfolioScore,
  buildPortfolioPulse,
  buildPortfolioPulseSnapshots,
  buildWeeklyPortfolioScore,
  DAILY_PORTFOLIO_SCORE_VERSION,
  MONTHLY_PORTFOLIO_SCORE_VERSION,
  WEEKLY_PORTFOLIO_SCORE_VERSION,
} from "@/lib/services/portfolio/periodScores";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "assetType">,
): StoredPortfolioHolding {
  return {
    name: partial.symbol,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    ...partial,
  };
}

function history(
  period: "1W" | "1M",
  returnPercent: number | null,
  extras?: Partial<PortfolioPerformanceHistoryApiResponse>,
): PortfolioPerformanceHistoryApiResponse {
  return {
    success: returnPercent != null,
    period,
    chartPoints: [],
    startingValue: 100_000,
    endingValue: 100_000,
    investmentReturn: 0,
    investmentReturnPercent: returnPercent,
    dataAvailability: returnPercent == null ? "unavailable" : "full",
    availabilityMessage: null,
    historicalFxApproximate: false,
    coveredHoldingCount: 4,
    skippedHoldingCount: 0,
    ...extras,
  };
}

describe("Daily Portfolio Score", () => {
  it("scores a broad positive session without inventing a neutral 50", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        assetType: "investment",
        quantity: 100,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "b",
        symbol: "CSPX",
        assetType: "investment",
        quantity: 20,
        currentPrice: 550,
        previousClose: 500,
      }),
      holding({
        id: "c",
        symbol: "AIFS",
        assetType: "investment",
        quantity: 200,
        currentPrice: 26,
        previousClose: 25,
      }),
    ];
    const score = buildDailyPortfolioScore({
      holdings,
      calculatedAt: "2026-08-03T10:00:00.000Z",
    });
    expect(score.available).toBe(true);
    expect(score.value).not.toBeNull();
    expect(score.value!).toBeGreaterThan(60);
    expect(score.value!).toBeLessThanOrEqual(100);
    expect(score.version).toBe(DAILY_PORTFOLIO_SCORE_VERSION);
    expect(score.band?.label).toMatch(/Positive|Strong|Mixed/);
    expect(score.evidence.some((e) => e.id === "breadth")).toBe(true);
    expect(score.summary.toLowerCase()).toMatch(/broad|strong|positive/);
  });

  it("dampens a one-holding-driven gain and states concentration", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "AIFS",
        assetType: "investment",
        quantity: 400,
        currentPrice: 40,
        previousClose: 25,
      }),
      holding({
        id: "b",
        symbol: "VWCE",
        assetType: "investment",
        quantity: 10,
        currentPrice: 100,
        previousClose: 100.1,
      }),
      holding({
        id: "c",
        symbol: "CSPX",
        assetType: "investment",
        quantity: 5,
        currentPrice: 500,
        previousClose: 500.2,
      }),
    ];
    const concentrated = buildDailyPortfolioScore({ holdings });
    const broad = buildDailyPortfolioScore({
      holdings: [
        holding({
          id: "a",
          symbol: "AIFS",
          assetType: "investment",
          quantity: 100,
          currentPrice: 26,
          previousClose: 25,
        }),
        holding({
          id: "b",
          symbol: "VWCE",
          assetType: "investment",
          quantity: 100,
          currentPrice: 110,
          previousClose: 100,
        }),
        holding({
          id: "c",
          symbol: "CSPX",
          assetType: "investment",
          quantity: 20,
          currentPrice: 550,
          previousClose: 500,
        }),
      ],
    });
    expect(concentrated.available).toBe(true);
    expect(broad.available).toBe(true);
    expect(concentrated.value!).toBeLessThan(broad.value!);
    expect(concentrated.summary.toLowerCase()).toMatch(/driven|concentrated/);
  });

  it("scores a broad negative session below a mixed/stable band midpoint", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        assetType: "investment",
        quantity: 100,
        currentPrice: 95,
        previousClose: 100,
      }),
      holding({
        id: "b",
        symbol: "CSPX",
        assetType: "investment",
        quantity: 20,
        currentPrice: 475,
        previousClose: 500,
      }),
      holding({
        id: "c",
        symbol: "AIFS",
        assetType: "investment",
        quantity: 200,
        currentPrice: 23,
        previousClose: 25,
      }),
    ];
    const score = buildDailyPortfolioScore({ holdings });
    expect(score.available).toBe(true);
    expect(score.value!).toBeLessThan(50);
    expect(score.band?.label.toLowerCase()).toMatch(/weak|mixed|stressed/);
  });

  it("preserves mixed timing context for equity + crypto", () => {
    const holdings = [
      holding({
        id: "eq",
        symbol: "VWCE",
        assetType: "investment",
        quantity: 50,
        currentPrice: 102,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        assetType: "crypto",
        quantity: 0.5,
        currentPrice: 100_000,
        change24hPercent: 2,
        tradingPair: "BTC-EUR",
        pairCurrency: "EUR",
        portfolioCurrency: "EUR",
      }),
    ];
    const score = buildDailyPortfolioScore({ holdings });
    expect(score.available).toBe(true);
    expect(score.timingContext.toLowerCase()).toMatch(
      /crypto|24h|session|mixed/,
    );
  });

  it("does not invent a score when prices are missing", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        assetType: "investment",
        quantity: 10,
        currentPrice: 100,
        // no previousClose
      }),
    ];
    const score = buildDailyPortfolioScore({
      holdings,
      marketsClosed: true,
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
    expect(score.unavailableReason).toBeTruthy();
    expect(score.value).not.toBe(50);
  });

  it("still scores a one-holding portfolio with concentration evidence", () => {
    const score = buildDailyPortfolioScore({
      holdings: [
        holding({
          id: "only",
          symbol: "VWCE",
          assetType: "investment",
          quantity: 100,
          currentPrice: 105,
          previousClose: 100,
        }),
      ],
    });
    expect(score.available).toBe(true);
    expect(score.evidence.some((e) => e.id === "concentration")).toBe(true);
    expect(score.summary.toLowerCase()).toMatch(/concentrated|one holding/);
  });
});

describe("Weekly Portfolio Score", () => {
  it("scores a positive week from 1W history and never uses fabricated 1D", () => {
    const score = buildWeeklyPortfolioScore({
      week: history("1W", 3.2),
      month: history("1M", 5.1),
      calculatedAt: "2026-08-03T10:00:00.000Z",
    });
    expect(score.available).toBe(true);
    expect(score.value!).toBeGreaterThan(55);
    expect(score.version).toBe(WEEKLY_PORTFOLIO_SCORE_VERSION);
    expect(score.evidence.some((e) => e.id === "week-return")).toBe(true);
    expect(score.evidence.every((e) => e.id !== "daily-return")).toBe(true);
  });

  it("dampens concentrated weekly breadth when provided (not from 1D)", () => {
    const concentrated = buildWeeklyPortfolioScore({
      week: history("1W", 4),
      month: history("1M", 4.5),
      weeklyBreadth: {
        measuredCount: 4,
        positiveCount: 1,
        topContributorSharePercent: 88,
        topContributorSymbol: "AIFS",
      },
    });
    const broad = buildWeeklyPortfolioScore({
      week: history("1W", 4),
      month: history("1M", 4.5),
      weeklyBreadth: {
        measuredCount: 4,
        positiveCount: 4,
        topContributorSharePercent: 28,
        topContributorSymbol: "VWCE",
      },
    });
    expect(concentrated.value!).toBeLessThan(broad.value!);
    expect(concentrated.summary.toLowerCase()).toMatch(/concentrated/);
  });

  it("reflects mixed 1W/1M direction in evidence and score", () => {
    const aligned = buildWeeklyPortfolioScore({
      week: history("1W", 2),
      month: history("1M", 3),
    });
    const mixed = buildWeeklyPortfolioScore({
      week: history("1W", 2),
      month: history("1M", -3),
    });
    expect(mixed.value!).toBeLessThan(aligned.value!);
    expect(mixed.summary.toLowerCase()).toMatch(/differ|mixed|week/);
  });

  it("scores a negative week below 50", () => {
    const score = buildWeeklyPortfolioScore({
      week: history("1W", -4.5),
      month: history("1M", -2),
    });
    expect(score.available).toBe(true);
    expect(score.value!).toBeLessThan(50);
  });

  it("shows More history needed without fabricating a score", () => {
    const score = buildWeeklyPortfolioScore({
      week: history("1W", null, { success: false }),
      month: history("1M", 2),
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
    expect(score.unavailableReason).toBe("More history needed");
  });
});

describe("Monthly Portfolio Score", () => {
  it("scores structural improvement, not 1M return alone", () => {
    const strongReturnWeakStructure = buildMonthlyPortfolioScore({
      month: history("1M", 12),
      week: history("1W", 2),
      resilienceScore: 28,
      largestHoldingWeightPercent: 78,
      calculatedAt: "2026-08-03T10:00:00.000Z",
    });
    const moderateReturnStrongStructure = buildMonthlyPortfolioScore({
      month: history("1M", 3),
      week: history("1W", 1),
      resilienceScore: 82,
      largestHoldingWeightPercent: 28,
    });
    expect(strongReturnWeakStructure.available).toBe(true);
    expect(moderateReturnStrongStructure.available).toBe(true);
    expect(strongReturnWeakStructure.version).toBe(MONTHLY_PORTFOLIO_SCORE_VERSION);
    expect(moderateReturnStrongStructure.value!).toBeGreaterThan(
      strongReturnWeakStructure.value!,
    );
    expect(strongReturnWeakStructure.evidence.some((e) => e.id === "structure")).toBe(
      true,
    );
  });

  it("applies a goal-behind penalty when a saved goal exists", () => {
    const onTrack = buildMonthlyPortfolioScore({
      month: history("1M", 4),
      week: history("1W", 1),
      resilienceScore: 70,
      hasSavedGoal: true,
      goalStatus: "On track",
    });
    const behind = buildMonthlyPortfolioScore({
      month: history("1M", 4),
      week: history("1W", 1),
      resilienceScore: 70,
      hasSavedGoal: true,
      goalStatus: "Behind schedule",
    });
    expect(behind.value!).toBeLessThan(onTrack.value!);
    expect(behind.evidence.some((e) => e.id === "goal-status")).toBe(true);
  });

  it("still scores without a goal", () => {
    const score = buildMonthlyPortfolioScore({
      month: history("1M", 2.5),
      week: history("1W", 0.5),
      hasSavedGoal: false,
    });
    expect(score.available).toBe(true);
    expect(score.evidence.every((e) => e.id !== "goal-status")).toBe(true);
  });

  it("shows More history needed without fabricating a monthly score", () => {
    const score = buildMonthlyPortfolioScore({
      month: history("1M", null, { success: false }),
      resilienceScore: 80,
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
    expect(score.unavailableReason).toBe("More history needed");
  });

  it("uses concentration when Resilience is unavailable", () => {
    const score = buildMonthlyPortfolioScore({
      month: history("1M", 5),
      largestHoldingWeightPercent: 72,
    });
    expect(score.available).toBe(true);
    expect(score.evidence.find((e) => e.id === "structure")?.explanation).toMatch(
      /Largest holding/i,
    );
  });
});

describe("Portfolio Pulse combined summary", () => {
  it("writes one evidence-based sentence instead of bare band labels", () => {
    const summary = buildCombinedPulseSummary(
      "Mixed session: the move is driven mainly by VWCE.",
      "Mixed week: weekly and monthly direction differ.",
      true,
      true,
    );
    expect(summary).not.toMatch(/^Mixed session\. Mixed week\.?$/i);
    expect(summary.toLowerCase()).toContain("vwce");
    expect(summary.split(".").filter(Boolean).length).toBe(1);
    expect(summary.length).toBeLessThan(90);
  });

  it("uses a natural broad-participation sentence when evidence supports it", () => {
    const summary = buildCombinedPulseSummary(
      "Strong session: today’s move is broad across holdings.",
      "Positive week: weekly and monthly direction are aligned.",
      true,
      true,
    );
    expect(summary).toBe(
      "Broad participation supports today’s portfolio move.",
    );
  });

  it("uses a mixed-day / positive-week sentence when bands are the only evidence", () => {
    const summary = buildCombinedPulseSummary(
      "Mixed session: see evidence for breadth and concentration.",
      "Positive week: based on verified 1W portfolio history.",
      true,
      true,
    );
    expect(summary).toBe(
      "Daily performance is mixed while the weekly trend remains positive.",
    );
  });

  it("falls back deterministically when evidence is limited", () => {
    expect(buildCombinedPulseSummary("", "", false, false)).toBe(
      "Daily and weekly scores need more verified market data.",
    );
  });
});

describe("Portfolio Pulse snapshot contract", () => {
  it("exposes serializable snapshots with null previous/delta", () => {
    const pulse = buildPortfolioPulse({
      daily: {
        holdings: [
          holding({
            id: "a",
            symbol: "VWCE",
            assetType: "investment",
            quantity: 10,
            currentPrice: 101,
            previousClose: 100,
          }),
        ],
      },
      weekly: {
        week: history("1W", 1.2),
        month: history("1M", 2.4),
      },
      calculatedAt: "2026-08-03T12:00:00.000Z",
    });
    const snapshots = buildPortfolioPulseSnapshots(pulse);
    expect(snapshots.daily.previousValue).toBeNull();
    expect(snapshots.daily.delta).toBeNull();
    expect(snapshots.weekly.evidenceIds.length).toBeGreaterThan(0);
    expect(snapshots.monthly.evidenceIds.length).toBeGreaterThan(0);
    expect(pulse.monthly.available).toBe(true);
    expect(snapshots.combinedSummary.length).toBeGreaterThan(0);
    expect(snapshots.combinedSummary).not.toMatch(
      /^Mixed session\. Mixed week\.?$/i,
    );
  });

  it("builds a Monthly score from verified 1M history", () => {
    const pulse = buildPortfolioPulse({
      daily: { holdings: [] },
      weekly: {
        week: history("1W", 0.8),
        month: history("1M", 3.5),
      },
    });
    expect(pulse.monthly.available).toBe(true);
    expect(pulse.monthly.value).not.toBeNull();
    expect(pulse.monthly.id).toBe("monthly");
  });
});

describe("Dashboard Portfolio Pulse wiring", () => {
  it("removes structural four-score card and keeps Scorecard page", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const scorecardPage = read(
      "components/portfolioHealth/PortfolioHealthPage.tsx",
    );
    const pulse = read("components/dashboard/HeroPortfolioPulse.tsx");
    const hero = read("components/dashboard/PortfolioValueCard.tsx");
    const ring = read("components/dashboard/DynamicScoreRing.tsx");
    const briefing = read(
      "components/dashboard/DashboardTodaysMarketBriefing.tsx",
    );

    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("buildPortfolioScorecard");
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).toContain("buildPortfolioPulse");
    expect(dashboard).toContain("HoldingsToday");
    expect(dashboard).toContain("DashboardTodaysMarketBriefing");
    expect(dashboard).not.toContain("DashboardTodaysDecision");
    expect(dashboard).not.toContain("DashboardIntelligencePreview");
    expect(dashboard).not.toContain("DashboardPortfolioPulseCard");

    const pulseIdx = dashboard.indexOf("pulse={portfolioPulse}");
    const holdingsIdx = dashboard.indexOf("<HoldingsToday");
    const briefingIdx = dashboard.indexOf("<DashboardTodaysMarketBriefing");
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(briefingIdx).toBeGreaterThan(pulseIdx);
    expect(holdingsIdx).toBeGreaterThan(briefingIdx);

    expect(scorecardPage).toContain("buildPortfolioScorecard");
    expect(scorecardPage).toContain("ScoreRing");
    expect(hero).toContain("HeroPortfolioPulse");
    expect(pulse).toContain("Scorecard");
    expect(pulse).toContain("DASHBOARD_DEEP_LINKS.scorecard");
    expect(pulse).toContain("PortfolioPulseDetailSheet");
    expect(pulse).toContain("onActivate");
    expect(pulse).toContain("size={60}");
    expect(pulse).toContain("size={56}");
    expect(pulse).toContain("pulse.monthly");
    expect(pulse).toContain('emphasis="primary"');
    expect(pulse).not.toContain("pulse.combinedSummary");
    expect(pulse).toContain('appearance="onDark"');
    expect(ring).toContain('emphasis?: "primary" | "default"');
    expect(ring).toContain('appearance?: "onLight" | "onDark"');
    expect(ring).toContain("onActivate");
    expect(dashboard).toContain("buildResilienceProfile");
    expect(dashboard).toContain("resilienceScore");
    expect(briefing).toContain("Markets today");
    expect(pulse).not.toContain("overflow-x-auto");
  });
});
