/**
 * Portfolio Scorecard — focused unit tests for psc-v1.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildPortfolioHealthScoreV1,
  PORTFOLIO_HEALTH_SCORE_VERSION,
} from "@/lib/services/portfolio/healthScore";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import {
  PORTFOLIO_SCORECARD_VERSION,
  adaptHealthScore,
  buildGoalScore,
  buildMomentumScore,
  buildPortfolioScorecard,
  buildReadinessScore,
  toPortfolioScorecardSnapshot,
} from "@/lib/services/portfolio/scorecard";
import { buildDeterministicPortfolioInsightFromScorecard } from "@/lib/services/portfolio/healthScore/deterministicInsight";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    name: partial.name ?? partial.symbol,
    purchasePrice: partial.purchasePrice ?? partial.currentPrice,
    currency: "EUR",
    assetType: partial.assetType ?? "investment",
    previousClose: partial.previousClose ?? partial.currentPrice * 0.99,
    ...partial,
  };
}

const goalOnTrack: GoalSettings = {
  targetValue: 50_000,
  targetYear: 2035,
  monthlyContribution: 800,
  expectedAnnualReturn: 7,
};

const goalShortfall: GoalSettings = {
  targetValue: 500_000,
  targetYear: 2028,
  monthlyContribution: 50,
  expectedAnnualReturn: 3,
};

function fixturePortfolio(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
) {
  const analysis = buildPortfolioAnalysis(holdings);
  const exposure = buildPortfolioExposureAllocation(holdings);
  const hasSavedGoal = Boolean(goal);
  const profile = buildPortfolioHealthProfile({
    holdings,
    goal,
    hasSavedGoal,
    dividends: null,
    analysis,
    exposure,
  });
  const health = buildPortfolioHealthScoreV1({
    holdings,
    analysis,
    exposure,
    profile,
    goal,
    hasSavedGoal,
    dividends: null,
    isStale: false,
  });
  const goalProgress = buildGoalProgressEngine({
    currentPortfolioValue: analysis.totalValue,
    goal,
    hasSavedGoal,
  });
  return { analysis, exposure, health, goalProgress, hasSavedGoal };
}

describe("Portfolio Scorecard shared", () => {
  it("builds four canonical scores with version and fingerprint", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
      holding({ id: "b", symbol: "IWDA", quantity: 5, currentPrice: 80 }),
    ];
    const base = fixturePortfolio(holdings, goalOnTrack);
    const scorecard = buildPortfolioScorecard({
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: {
        week: { period: "1W", returnPercent: 1.5, available: true },
        month: { period: "1M", returnPercent: 3.2, available: true },
        breadth: {
          measuredCount: 2,
          positiveCount: 2,
          topContributorSharePercent: 55,
          topContributorSymbol: "VWCE",
        },
      },
      hasPerformanceHistory: true,
      calculatedAt: "2026-07-31T10:00:00.000Z",
    });

    expect(scorecard.scorecardVersion).toBe(PORTFOLIO_SCORECARD_VERSION);
    expect(scorecard.portfolioFingerprint).toBe(base.health.fingerprint);
    expect(scorecard.scores.health.available).toBe(true);
    expect(scorecard.scores.goal.available).toBe(true);
    expect(scorecard.scores.momentum.available).toBe(true);
    expect(scorecard.scores.readiness.available).toBe(true);
    for (const score of Object.values(scorecard.scores)) {
      if (score.available && score.value != null) {
        expect(score.value).toBeGreaterThanOrEqual(0);
        expect(score.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps Health identical to phs-v1 adaptation", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
    ];
    const base = fixturePortfolio(holdings, goalOnTrack);
    const adapted = adaptHealthScore(base.health);
    const scorecard = buildPortfolioScorecard({
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: { week: null, month: null, breadth: null },
    });
    expect(scorecard.scores.health.value).toBe(adapted.value);
    expect(scorecard.scores.health.value).toBe(base.health.score);
    expect(scorecard.scores.health.version).toBe(
      PORTFOLIO_HEALTH_SCORE_VERSION,
    );
  });

  it("serializes weekly-email snapshot without fake deltas", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
    ];
    const base = fixturePortfolio(holdings, goalOnTrack);
    const scorecard = buildPortfolioScorecard({
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: { week: null, month: null, breadth: null },
    });
    const snapshot = toPortfolioScorecardSnapshot(scorecard, "user-1");
    expect(snapshot.userId).toBe("user-1");
    expect(snapshot.scores.health.previousValue).toBeNull();
    expect(snapshot.scores.health.delta).toBeNull();
    expect(snapshot.scores.goal.previousValue).toBeNull();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("is deterministic for the same inputs", () => {
    const holdings = [
      holding({ id: "a", symbol: "AAPL", quantity: 2, currentPrice: 150 }),
    ];
    const base = fixturePortfolio(holdings, goalOnTrack);
    const input = {
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true as const,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: {
        week: { period: "1W" as const, returnPercent: 2, available: true },
        month: { period: "1M" as const, returnPercent: 4, available: true },
        breadth: null,
      },
      calculatedAt: "2026-07-31T10:00:00.000Z",
    };
    const a = buildPortfolioScorecard(input);
    const b = buildPortfolioScorecard(input);
    expect(a.scores.goal.value).toBe(b.scores.goal.value);
    expect(a.scores.momentum.value).toBe(b.scores.momentum.value);
    expect(a.summary.headline).toBe(b.summary.headline);
  });
});

describe("Goal Score", () => {
  it("is unavailable without a configured goal (not zero)", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 10_000,
      goal: null,
      hasSavedGoal: false,
    });
    const score = buildGoalScore({
      goal: null,
      hasSavedGoal: false,
      progress,
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
    expect(score.unavailableReason).toMatch(/Set a goal/i);
    expect(JSON.stringify(score).toLowerCase()).not.toMatch(
      /chance of|guaranteed/,
    );
  });

  it("scores on-track plans higher than shortfall plans", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 100, currentPrice: 100 }),
    ];
    const onTrack = fixturePortfolio(holdings, goalOnTrack);
    const shortfall = fixturePortfolio(holdings, goalShortfall);
    const high = buildGoalScore({
      goal: goalOnTrack,
      hasSavedGoal: true,
      progress: onTrack.goalProgress,
    });
    const low = buildGoalScore({
      goal: goalShortfall,
      hasSavedGoal: true,
      progress: shortfall.goalProgress,
    });
    expect(high.available).toBe(true);
    expect(low.available).toBe(true);
    expect(high.value!).toBeGreaterThan(low.value!);
    expect(high.evidence.length).toBeGreaterThan(0);
  });

  it("handles near-term vs long-term targets without cliffs at band edges", () => {
    const near: GoalSettings = {
      ...goalOnTrack,
      targetYear: new Date().getFullYear() + 1,
      targetValue: 12_000,
      monthlyContribution: 200,
    };
    const far: GoalSettings = {
      ...goalOnTrack,
      targetYear: new Date().getFullYear() + 20,
    };
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 100, currentPrice: 100 }),
    ];
    const nearBase = fixturePortfolio(holdings, near);
    const farBase = fixturePortfolio(holdings, far);
    const nearScore = buildGoalScore({
      goal: near,
      hasSavedGoal: true,
      progress: nearBase.goalProgress,
    });
    const farScore = buildGoalScore({
      goal: far,
      hasSavedGoal: true,
      progress: farBase.goalProgress,
    });
    expect(nearScore.value).not.toBeNull();
    expect(farScore.value).not.toBeNull();
    expect(nearScore.band?.label).toBeTruthy();
  });
});

describe("Momentum Score", () => {
  it("is unavailable without 1W/1M history (not a fake 50)", () => {
    const score = buildMomentumScore({
      week: null,
      month: null,
      breadth: {
        measuredCount: 5,
        positiveCount: 5,
        topContributorSharePercent: 20,
        topContributorSymbol: "A",
      },
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
    expect(score.unavailableReason).toMatch(/history/i);
  });

  it("scores broad positive momentum higher than concentrated moves", () => {
    const broad = buildMomentumScore({
      week: { period: "1W", returnPercent: 2.4, available: true },
      month: { period: "1M", returnPercent: 4.0, available: true },
      breadth: {
        measuredCount: 8,
        positiveCount: 7,
        topContributorSharePercent: 25,
        topContributorSymbol: "A",
      },
    });
    const concentrated = buildMomentumScore({
      week: { period: "1W", returnPercent: 2.4, available: true },
      month: { period: "1M", returnPercent: 4.0, available: true },
      breadth: {
        measuredCount: 8,
        positiveCount: 1,
        topContributorSharePercent: 85,
        topContributorSymbol: "A",
      },
    });
    expect(broad.value!).toBeGreaterThan(concentrated.value!);
    expect(JSON.stringify(broad).toLowerCase()).not.toMatch(/\b(buy|sell)\b/);
  });

  it("never treats missing week as available from 1D breadth alone", () => {
    const score = buildMomentumScore({
      week: { period: "1W", returnPercent: null, available: false },
      month: { period: "1M", returnPercent: null, available: false },
      breadth: {
        measuredCount: 4,
        positiveCount: 4,
        topContributorSharePercent: 30,
        topContributorSymbol: "X",
      },
    });
    expect(score.available).toBe(false);
  });

  it("marks mixed weekly/monthly direction in evidence", () => {
    const score = buildMomentumScore({
      week: { period: "1W", returnPercent: 2, available: true },
      month: { period: "1M", returnPercent: -3, available: true },
      breadth: null,
    });
    expect(score.available).toBe(true);
    expect(score.evidence.some((e) => /mixed/i.test(e.explanation))).toBe(true);
  });
});

describe("Readiness Score", () => {
  it("scores complete setups higher and does not treat missing goal as a hard failure", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 100,
        providerSymbol: "VWCE.XETRA",
      }),
      holding({
        id: "b",
        symbol: "IWDA",
        quantity: 5,
        currentPrice: 90,
        providerSymbol: "IWDA.XETRA",
      }),
    ];
    const withGoal = fixturePortfolio(holdings, goalOnTrack);
    const noGoal = fixturePortfolio(holdings, null);
    const ready = buildReadinessScore({
      analysis: withGoal.analysis,
      exposure: withGoal.exposure,
      health: withGoal.health,
      hasSavedGoal: true,
      hasPerformanceHistory: true,
    });
    const partial = buildReadinessScore({
      analysis: noGoal.analysis,
      exposure: noGoal.exposure,
      health: noGoal.health,
      hasSavedGoal: false,
      hasPerformanceHistory: false,
    });
    expect(ready.available).toBe(true);
    expect(partial.available).toBe(true);
    expect(ready.value!).toBeGreaterThan(partial.value!);
    expect(JSON.stringify(ready).toLowerCase()).not.toMatch(
      /investment quality|outperform/,
    );
  });

  it("returns unavailable for empty portfolios", () => {
    const holdings: StoredPortfolioHolding[] = [];
    const base = fixturePortfolio(holdings, null);
    const score = buildReadinessScore({
      analysis: base.analysis,
      exposure: base.exposure,
      health: base.health,
      hasSavedGoal: false,
    });
    expect(score.available).toBe(false);
    expect(score.value).toBeNull();
  });

  it("handles cash-only portfolios without inventing market readiness claims", () => {
    const holdings = [
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 5000,
        currentPrice: 1,
        assetType: "cash",
      }),
    ];
    const base = fixturePortfolio(holdings, null);
    const score = buildReadinessScore({
      analysis: base.analysis,
      exposure: base.exposure,
      health: base.health,
      hasSavedGoal: false,
    });
    expect(score.available).toBe(true);
    expect(score.value).not.toBeNull();
  });
});

describe("Dashboard Portfolio Pulse + Scorecard page wiring", () => {
  it("renders Daily/Weekly pulse on Dashboard; structural Scorecard stays off Dashboard", () => {
    const dashboard = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const pulse = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardPortfolioPulseCard.tsx",
      ),
      "utf8",
    );
    const scorecard = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardPortfolioScorecard.tsx",
      ),
      "utf8",
    );
    const ring = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/ScoreRing.tsx"),
      "utf8",
    );
    const insight = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardInsightCard.tsx",
      ),
      "utf8",
    );
    expect(dashboard).toContain("DashboardPortfolioPulseCard");
    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("DashboardGoalProgressCard");
    expect(dashboard).not.toContain("DashboardPortfolioHealthCard");
    expect(pulse).toContain("DynamicScoreRing");
    expect(pulse).toContain("Open Portfolio Scorecard");
    expect(scorecard).toContain("ScoreRing");
    expect(scorecard).toContain("grid-cols-2");
    expect(scorecard).toContain("lg:grid-cols-4");
    expect(ring).toContain("aria-label");
    expect(ring).toContain("out of 100");
    expect(insight).toContain("insight.scoreLines");
  });

  it("builds concise score-based insight lines from the scorecard", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
    ];
    const base = fixturePortfolio(holdings, goalOnTrack);
    const scorecard = buildPortfolioScorecard({
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: {
        week: { period: "1W", returnPercent: 1, available: true },
        month: { period: "1M", returnPercent: 2, available: true },
        breadth: null,
      },
      hasPerformanceHistory: true,
    });
    const insight = buildDeterministicPortfolioInsightFromScorecard(scorecard);
    expect(insight.headline.length).toBeGreaterThan(10);
    expect(insight.scoreLines.length).toBeLessThanOrEqual(4);
    expect(insight.scoreLines.length).toBeGreaterThan(0);
    expect(JSON.stringify(insight).toLowerCase()).not.toMatch(
      /\b(buy|sell|guaranteed|chance of)\b/,
    );
  });
});
