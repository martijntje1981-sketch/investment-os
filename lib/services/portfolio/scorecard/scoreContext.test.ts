/**
 * Score context — factual drivers without investment advice.
 */

import { describe, expect, it } from "vitest";

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioHealthScoreV1 } from "@/lib/services/portfolio/healthScore";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import {
  assertNeutralScoreContextCopy,
  buildAllScoreContexts,
  buildGoalScoreContext,
  buildHealthScoreContext,
  buildMomentumScoreContext,
  buildPortfolioScorecard,
  buildReadinessScoreContext,
  findForbiddenAdvicePhrase,
  FORBIDDEN_SCORE_ADVICE_PHRASES,
} from "@/lib/services/portfolio/scorecard";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";
import { readFileSync } from "node:fs";
import path from "node:path";

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
    providerSymbol: partial.providerSymbol ?? `${partial.symbol}.XETRA`,
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

function fixture(holdings: StoredPortfolioHolding[], goal: GoalSettings | null) {
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
  return { analysis, exposure, health, goalProgress, hasSavedGoal, holdings };
}

function buildCard(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  momentumOverrides?: Partial<
    Parameters<typeof buildPortfolioScorecard>[0]["momentum"]
  >,
  healthStale = false,
) {
  const base = fixture(holdings, goal);
  const health = healthStale
    ? buildPortfolioHealthScoreV1({
        holdings,
        analysis: base.analysis,
        exposure: base.exposure,
        profile: buildPortfolioHealthProfile({
          holdings,
          goal,
          hasSavedGoal: base.hasSavedGoal,
          dividends: null,
          analysis: base.analysis,
          exposure: base.exposure,
        }),
        goal,
        hasSavedGoal: base.hasSavedGoal,
        dividends: null,
        isStale: true,
      })
    : base.health;

  return buildPortfolioScorecard({
    health,
    goal,
    hasSavedGoal: base.hasSavedGoal,
    goalProgress: base.goalProgress,
    analysis: base.analysis,
    exposure: base.exposure,
    momentum: {
      week: { period: "1W", returnPercent: -2.5, available: true },
      month: { period: "1M", returnPercent: -1.2, available: true },
      breadth: {
        measuredCount: 2,
        positiveCount: 0,
        topContributorSharePercent: 80,
        topContributorSymbol: holdings[0]?.symbol ?? "X",
      },
      ...momentumOverrides,
    },
    hasPerformanceHistory: true,
    holdings,
    calculatedAt: "2026-07-31T10:00:00.000Z",
  });
}

describe("score context builders", () => {
  it("selects concentration as the primary Health factor when one holding dominates", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "IB1T",
        quantity: 70,
        currentPrice: 100,
        providerSymbol: "IB1T.XETRA",
      }),
      holding({
        id: "b",
        symbol: "AIFS",
        quantity: 30,
        currentPrice: 100,
        providerSymbol: "AIFS.XETRA",
      }),
    ];
    const base = fixture(holdings, goalOnTrack);
    const largestWeight = Math.round(
      base.analysis.largestPosition?.weightPercent ?? 0,
    );
    expect(largestWeight).toBeGreaterThanOrEqual(35);
    expect(base.analysis.largestPosition?.holding.symbol).toBe("IB1T");
    const context = buildHealthScoreContext({
      analysis: base.analysis,
      exposure: base.exposure,
      health: base.health,
    });

    expect(context.headline).toMatch(/Concentration is high/i);
    expect(context.headline).toContain(`${largestWeight}%`);
    expect(context.detail).toMatch(/IB1T/);
    expect(context.href).toBe(DASHBOARD_DEEP_LINKS.scorecardHealth);
    expect(context.linkLabel).toBe("View allocation");
    expect(findForbiddenAdvicePhrase(context.headline)).toBeNull();
  });

  it("never tells the user to alter an allocation in Health context", () => {
    const holdings = [
      holding({ id: "a", symbol: "TECH", quantity: 80, currentPrice: 100 }),
      holding({ id: "b", symbol: "CASH", quantity: 2000, currentPrice: 1, assetType: "cash", providerSymbol: null }),
    ];
    const card = buildCard(holdings, goalOnTrack);
    const text = [
      card.scores.health.context?.headline,
      card.scores.health.context?.detail,
      ...(card.scores.health.context?.factors?.map((f) => f.label) ?? []),
    ].join(" ");
    for (const phrase of FORBIDDEN_SCORE_ADVICE_PHRASES) {
      expect(findForbiddenAdvicePhrase(text)).toBeNull();
      expect(text.toLowerCase()).not.toContain(` ${phrase} `);
    }
    expect(text.toLowerCase()).not.toMatch(/\breduce\b|\brebalance\b|\bbuy\b|\bsell\b/);
  });

  it("names the largest Momentum contributor with correct sign and period", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "IB1T",
        quantity: 10,
        currentPrice: 97,
        previousClose: 100,
        providerSymbol: "IB1T.XETRA",
        marketPriceUpdatedAt: "2026-07-30T16:00:00.000Z",
      }),
      holding({
        id: "b",
        symbol: "AIFS",
        quantity: 5,
        currentPrice: 101,
        previousClose: 100,
        providerSymbol: "AIFS.XETRA",
        marketPriceUpdatedAt: "2026-07-30T16:00:00.000Z",
      }),
    ];
    const card = buildCard(holdings, goalOnTrack, {
      week: { period: "1W", returnPercent: -3, available: true },
      month: { period: "1M", returnPercent: -2, available: true },
    });
    const headline = card.scores.momentum.context?.headline ?? "";
    expect(headline).toMatch(/IB1T/);
    expect(headline).toMatch(/-/);
    expect(headline.toLowerCase()).not.toContain("today");
    expect(card.scores.momentum.context?.href).toBe("/market-pulse");
    expect(card.scores.momentum.context?.linkLabel).toBe("View Market Pulse");
  });

  it("uses closed-market / latest-session wording for equities", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 99,
        previousClose: 100,
        marketPriceUpdatedAt: "2026-07-25T16:00:00.000Z",
      }),
    ];
    const base = fixture(holdings, goalOnTrack);
    const momentumScore = buildCard(holdings, goalOnTrack, {
      week: { period: "1W", returnPercent: 0.1, available: true },
      month: { period: "1M", returnPercent: 0.2, available: true },
      breadth: {
        measuredCount: 1,
        positiveCount: 0,
        topContributorSharePercent: 100,
        topContributorSymbol: "VWCE",
      },
    }).scores.momentum;

    const context = buildMomentumScoreContext({
      momentum: {
        week: { period: "1W", returnPercent: 0.1, available: true },
        month: { period: "1M", returnPercent: 0.2, available: true },
        breadth: null,
      },
      momentumScore,
      holdings,
    });

    expect(context.headline.toLowerCase()).not.toContain("today");
    expect(
      /latest session|latest available session|markets are closed|influenced by/i.test(
        context.headline,
      ),
    ).toBe(true);
    expect(base.analysis.totalValue).toBeGreaterThan(0);
  });

  it("describes Goal projection status without prescribing a change", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
    ];
    const card = buildCard(holdings, goalShortfall, {
      week: { period: "1W", returnPercent: 1, available: true },
      month: { period: "1M", returnPercent: 2, available: true },
    });
    const context = card.scores.goal.context!;
    expect(context.headline).toMatch(/below the current target path|within the goal path|assumptions/i);
    expect(context.href).toBe("/goals");
    expect(context.linkLabel).toBe("View scenarios");
    assertNeutralScoreContextCopy(context);
    expect(context.headline.toLowerCase()).not.toMatch(
      /\bcontribute\b|\brisk\b|\bbuy\b|\bsell\b|\bincrease\b|\breduce\b/,
    );
  });

  it("identifies stale and unmatched holdings in Readiness", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 100,
        priceDataStatus: "stale",
      }),
      holding({
        id: "b",
        symbol: "MYST",
        quantity: 5,
        currentPrice: 50,
        providerSymbol: null,
        requiresConfirmation: true,
      }),
    ];
    const card = buildCard(holdings, goalOnTrack, undefined, true);
    const context = card.scores.readiness.context!;
    expect(context.headline).toMatch(/stale price data/i);
    expect(context.href).toBe("/portfolio");
    expect(context.linkLabel).toBe("Review holdings");
    assertNeutralScoreContextCopy(context);

    const unmatchedOnly = buildCard(
      [
        holding({
          id: "b",
          symbol: "MYST",
          quantity: 5,
          currentPrice: 50,
          providerSymbol: null,
          requiresConfirmation: true,
        }),
      ],
      goalOnTrack,
    ).scores.readiness.context!;
    expect(unmatchedOnly.headline).toMatch(/missing a confirmed provider match/i);
    expect(unmatchedOnly.href).toBe("/supported-instruments");
  });

  it("produces a factual all-clear for positive Readiness", () => {
    const holdings = [
      holding({
        id: "a",
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 100,
        priceDataStatus: "live",
        providerSymbol: "VWCE.XETRA",
      }),
      holding({
        id: "b",
        symbol: "IWDA",
        quantity: 5,
        currentPrice: 80,
        priceDataStatus: "live",
        providerSymbol: "IWDA.XETRA",
      }),
    ];
    const card = buildCard(holdings, goalOnTrack, {
      week: { period: "1W", returnPercent: 1, available: true },
      month: { period: "1M", returnPercent: 2, available: true },
      breadth: {
        measuredCount: 2,
        positiveCount: 2,
        topContributorSharePercent: 50,
        topContributorSymbol: "VWCE",
      },
    });
    const context = card.scores.readiness.context!;
    expect(context.headline).toMatch(/up to date|Data checks passed/i);
    expect(context.detail).toMatch(/Data checks passed/i);
    expect(context.status).toBe("positive");
    assertNeutralScoreContextCopy(context);
  });

  it("gives Dashboard and Scorecard identical context from the shared builder", () => {
    const holdings = [
      holding({ id: "a", symbol: "IB1T", quantity: 40, currentPrice: 100 }),
      holding({ id: "b", symbol: "AIFS", quantity: 10, currentPrice: 50 }),
    ];
    const a = buildCard(holdings, goalOnTrack);
    const b = buildCard(holdings, goalOnTrack);
    expect(a.scores.health.context).toEqual(b.scores.health.context);
    expect(a.scores.goal.context).toEqual(b.scores.goal.context);
    expect(a.scores.momentum.context).toEqual(b.scores.momentum.context);
    expect(a.scores.readiness.context).toEqual(b.scores.readiness.context);

    const rebuilt = buildAllScoreContexts({
      health: a.scores.health && fixture(holdings, goalOnTrack).health,
      analysis: fixture(holdings, goalOnTrack).analysis,
      exposure: fixture(holdings, goalOnTrack).exposure,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: fixture(holdings, goalOnTrack).goalProgress,
      goalScore: a.scores.goal,
      momentum: {
        week: { period: "1W", returnPercent: -2.5, available: true },
        month: { period: "1M", returnPercent: -1.2, available: true },
        breadth: {
          measuredCount: 2,
          positiveCount: 0,
          topContributorSharePercent: 80,
          topContributorSymbol: "IB1T",
        },
      },
      momentumScore: a.scores.momentum,
      readinessScore: a.scores.readiness,
      hasPerformanceHistory: true,
      holdings,
    });
    expect(rebuilt.health.headline).toBe(a.scores.health.context?.headline);
  });

  it("validates all context strings against the forbidden-advice list", () => {
    const holdings = [
      holding({ id: "a", symbol: "IB1T", quantity: 50, currentPrice: 100 }),
      holding({
        id: "b",
        symbol: "BTC",
        quantity: 0.1,
        currentPrice: 50_000,
        assetType: "crypto",
        change24hPercent: 1.5,
        providerSymbol: "BTC-EUR.CC",
      }),
    ];
    const card = buildCard(holdings, goalOnTrack);
    for (const score of Object.values(card.scores)) {
      expect(score.context).toBeDefined();
      assertNeutralScoreContextCopy(score.context!);
    }
  });

  it("points deep links at valid existing routes/anchors", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
    ];
    const card = buildCard(holdings, goalOnTrack);
    const hrefs = [
      card.scores.health.context?.href,
      card.scores.goal.context?.href,
      card.scores.momentum.context?.href,
      card.scores.readiness.context?.href,
    ];
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      expect(href).toMatch(
        /^\/(portfolio-health#health|goals|market-pulse|portfolio|supported-instruments|upload|analysis#portfolio-performance|portfolio-health#readiness)/,
      );
    }
  });

  it("does not crash on empty, guest, and incomplete-data states", () => {
    const emptyAnalysis = buildPortfolioAnalysis([]);
    const emptyExposure = buildPortfolioExposureAllocation([]);
    const emptyProfile = buildPortfolioHealthProfile({
      holdings: [],
      goal: null,
      hasSavedGoal: false,
      dividends: null,
      analysis: emptyAnalysis,
      exposure: emptyExposure,
    });
    const emptyHealth = buildPortfolioHealthScoreV1({
      holdings: [],
      analysis: emptyAnalysis,
      exposure: emptyExposure,
      profile: emptyProfile,
      goal: null,
      hasSavedGoal: false,
      dividends: null,
      isStale: false,
    });
    const emptyProgress = buildGoalProgressEngine({
      currentPortfolioValue: 0,
      goal: null,
      hasSavedGoal: false,
    });

    expect(() =>
      buildHealthScoreContext({
        analysis: emptyAnalysis,
        exposure: emptyExposure,
        health: emptyHealth,
      }),
    ).not.toThrow();

    expect(() =>
      buildGoalScoreContext({
        goal: null,
        hasSavedGoal: false,
        goalProgress: emptyProgress,
        goalScore: {
          id: "goal",
          version: "t",
          value: null,
          label: "Goal",
          shortLabel: "Goal",
          band: null,
          confidence: { level: "limited", label: "Limited confidence" },
          summary: "Set a goal",
          evidence: [],
          strengths: [],
          attentionPoints: [],
          calculatedAt: "2026-07-31T10:00:00.000Z",
          available: false,
          href: "/portfolio-health#goal",
        },
      }),
    ).not.toThrow();

    expect(() =>
      buildReadinessScoreContext({
        analysis: emptyAnalysis,
        exposure: emptyExposure,
        health: emptyHealth,
        readinessScore: {
          id: "readiness",
          version: "t",
          value: null,
          label: "Readiness",
          shortLabel: "Readiness",
          band: null,
          confidence: { level: "limited", label: "Limited confidence" },
          summary: "Add holdings",
          evidence: [],
          strengths: [],
          attentionPoints: [],
          calculatedAt: "2026-07-31T10:00:00.000Z",
          available: false,
          href: "/portfolio-health#readiness",
        },
        hasSavedGoal: false,
        holdings: [],
      }),
    ).not.toThrow();
  });

  it("leaves numeric score formulas unchanged while attaching context", () => {
    const holdings = [
      holding({ id: "a", symbol: "VWCE", quantity: 10, currentPrice: 100 }),
      holding({ id: "b", symbol: "IWDA", quantity: 5, currentPrice: 80 }),
    ];
    const withHoldings = buildCard(holdings, goalOnTrack);
    const base = fixture(holdings, goalOnTrack);
    const withoutContextPath = buildPortfolioScorecard({
      health: base.health,
      goal: goalOnTrack,
      hasSavedGoal: true,
      goalProgress: base.goalProgress,
      analysis: base.analysis,
      exposure: base.exposure,
      momentum: {
        week: { period: "1W", returnPercent: -2.5, available: true },
        month: { period: "1M", returnPercent: -1.2, available: true },
        breadth: {
          measuredCount: 2,
          positiveCount: 0,
          topContributorSharePercent: 80,
          topContributorSymbol: "VWCE",
        },
      },
      hasPerformanceHistory: true,
      calculatedAt: "2026-07-31T10:00:00.000Z",
    });

    expect(withHoldings.scores.health.value).toBe(
      withoutContextPath.scores.health.value,
    );
    expect(withHoldings.scores.goal.value).toBe(
      withoutContextPath.scores.goal.value,
    );
    expect(withHoldings.scores.momentum.value).toBe(
      withoutContextPath.scores.momentum.value,
    );
    expect(withHoldings.scores.readiness.value).toBe(
      withoutContextPath.scores.readiness.value,
    );
    expect(withHoldings.scores.health.context).toBeDefined();
  });
});

describe("score context UI wiring", () => {
  it("wires shared context into Scorecard and Dashboard surfaces", () => {
    const root = process.cwd();
    const page = readFileSync(
      path.join(root, "components/portfolioHealth/PortfolioHealthPage.tsx"),
      "utf8",
    );
    const ring = readFileSync(
      path.join(root, "components/dashboard/ScoreRing.tsx"),
      "utf8",
    );
    const detail = readFileSync(
      path.join(root, "components/portfolio/PortfolioScoreDetailSection.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(
      path.join(root, "components/dashboard/DashboardPortfolioScorecard.tsx"),
      "utf8",
    );

    expect(page).toContain("What shapes this score");
    expect(page).toContain(SCORECARD_LEGAL_SNIPPET);
    expect(detail).toContain("What shapes this score");
    expect(ring).toContain("showContext");
    expect(dashboard).toContain("showContext");
  });
});

const SCORECARD_LEGAL_SNIPPET =
  "Tobailey explains portfolio characteristics and scenarios. It does not provide personal investment advice.";
