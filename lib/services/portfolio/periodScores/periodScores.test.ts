/**
 * Focused Daily / Weekly Portfolio Score tests (no paid APIs).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildCombinedPulseSummary,
  buildDailyPortfolioScore,
  buildPortfolioPulse,
  buildPortfolioPulseSnapshots,
  buildWeeklyPortfolioScore,
  DAILY_PORTFOLIO_SCORE_VERSION,
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
    expect(score.band?.label).toMatch(/session/i);
    expect(score.evidence.some((e) => e.id === "breadth")).toBe(true);
    expect(score.summary.toLowerCase()).toMatch(/broad|strong|stable/);
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
    expect(score.band?.label.toLowerCase()).toMatch(/weak|mixed/);
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
    expect(snapshots.combinedSummary.length).toBeGreaterThan(0);
    expect(snapshots.combinedSummary).not.toMatch(
      /^Mixed session\. Mixed week\.?$/i,
    );
  });
});

describe("Dashboard Portfolio Pulse wiring", () => {
  it("removes structural four-score card and keeps Scorecard page", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const scorecardPage = read(
      "components/portfolioHealth/PortfolioHealthPage.tsx",
    );
    const pulse = read("components/dashboard/DashboardPortfolioPulseCard.tsx");
    const ring = read("components/dashboard/DynamicScoreRing.tsx");
    const briefing = read(
      "components/dashboard/DashboardTodaysMarketBriefing.tsx",
    );

    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("buildPortfolioScorecard");
    expect(dashboard).toContain("DashboardPortfolioPulseCard");
    expect(dashboard).toContain("buildPortfolioPulse");
    expect(dashboard).toContain("HoldingsToday");
    expect(dashboard).toContain("DashboardTodaysMarketBriefing");
    expect(dashboard).not.toContain("DashboardTodaysDecision");
    expect(dashboard).not.toContain("DashboardIntelligencePreview");

    const pulseIdx = dashboard.indexOf("<DashboardPortfolioPulseCard");
    const holdingsIdx = dashboard.indexOf("<HoldingsToday");
    const briefingIdx = dashboard.indexOf("<DashboardTodaysMarketBriefing");
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(holdingsIdx).toBeGreaterThan(pulseIdx);
    expect(briefingIdx).toBeGreaterThan(holdingsIdx);
    expect(dashboard).toContain("flex min-w-0 flex-col gap-4 md:gap-5");

    expect(scorecardPage).toContain("buildPortfolioScorecard");
    expect(scorecardPage).toContain("ScoreRing");
    expect(pulse).toContain("Open Portfolio Scorecard");
    expect(pulse).toContain("Portfolio pulse");
    expect(pulse).toContain("DASHBOARD_DEEP_LINKS.scorecard");
    expect(pulse).toContain("size={88}");
    expect(pulse).toContain("size={80}");
    expect(pulse).toContain('emphasis="primary"');
    expect(ring).toContain('emphasis?: "primary" | "default"');
    expect(ring).toContain("text-[8px]");
    expect(briefing).toContain("Today’s market briefing");
    expect(pulse).not.toContain("overflow-x-auto");
  });
});
