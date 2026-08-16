import { describe, expect, it } from "vitest";

import {
  buildGoalConclusion,
  buildHoldingsConclusion,
  buildMarketConclusion,
  buildPersonalIntelligenceConclusion,
  buildResilienceConclusion,
  buildReviewConclusion,
  DASHBOARD_ACTION_PLAN_MAX_ITEMS,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { REVIEW_PATH } from "@/lib/navigation/appRoutes";
import type { MarketCalmerResult } from "@/lib/services/marketCalmer";
import type { PersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence/types";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";

function quietView(): ThirtySecondsBriefingView {
  return {
    title: "Your portfolio in 30 seconds",
    headline: "A quiet day for the portfolio.",
    isQuiet: true,
    moveSummary: null,
    drivers: [],
    attentionItems: [],
    periodNote: null,
    coverageNote: null,
    supportingQuietLine: "Nothing material requires your attention today.",
  };
}

function activeView(): ThirtySecondsBriefingView {
  return {
    title: "Your portfolio in 30 seconds",
    headline: "Bitcoin led today’s move.",
    isQuiet: false,
    moveSummary: null,
    drivers: [
      {
        name: "Bitcoin",
        symbol: "BTC",
        contributionLabel: "+1.2 pp",
        periodLabel: null,
        tone: "positive",
      },
    ],
    attentionItems: [],
    periodNote: null,
    coverageNote: null,
    supportingQuietLine: null,
  };
}

function inactiveCalmer(): MarketCalmerResult {
  return {
    version: "market-calmer-v1",
    activation: "inactive",
    direction: "flat",
    portfolioMovePercent: null,
    headline: null,
    supportingFacts: [],
    mainDriver: null,
    scenarioContext: null,
    resilienceContext: null,
    goalContext: null,
    dataNotes: [],
    assumptions: [],
    limitations: [],
  };
}

function notableCalmer(): MarketCalmerResult {
  return {
    ...inactiveCalmer(),
    activation: "notable",
    direction: "negative",
    portfolioMovePercent: -2.1,
    headline: "A sharp Bitcoin move is driving most of today’s portfolio change.",
    mainDriver: {
      symbol: "BTC",
      name: "Bitcoin",
      contributionPp: -1.6,
      summary: "Bitcoin moved sharply versus its recent reference.",
    },
  };
}

function actionPlan(
  items: PersonalActionPlan["items"],
  isNoAction = false,
): PersonalActionPlan {
  return {
    version: "pi-action-v1",
    isNoAction,
    items,
  };
}

function stubIntelligence(
  attention: PersonalIntelligenceToday["attention"] = "nothing_requires_attention",
): PersonalIntelligenceToday {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    version: "pi-today-v1",
    attention,
    headline: "Quiet",
    portfolioMove: null,
    topContributors: [],
    topDetractors: [],
    holdingsWeights: [],
    exposure: null,
    news: null,
    goals: null,
    attentionItems: [],
    dataNotes: [],
  };
}

describe("dashboardConclusions presentation layer", () => {
  it("quiet day returns fewer intelligence surface items", () => {
    const plan = actionPlan(
      [
        {
          id: "quiet",
          category: "no_action_required",
          categoryLabel: "No action",
          headline: "Nothing required",
          detail: "Quiet",
          href: REVIEW_PATH,
        },
      ],
      true,
    );

    const conclusion = buildPersonalIntelligenceConclusion({
      intelligence: stubIntelligence(),
      view: quietView(),
      calmer: inactiveCalmer(),
      actionPlan: plan,
    });

    expect(conclusion.isQuiet).toBe(true);
    expect(conclusion.primaryConclusion).toBe("You’re up to date.");
    expect(conclusion.showFooterCta).toBe(true);
    expect(
      selectDashboardActionPlanItems(plan, {
        isQuiet: true,
        calmerActive: false,
      }),
    ).toHaveLength(0);
  });

  it("active day surfaces a clear primary conclusion", () => {
    const plan = actionPlan([
      {
        id: "watch-btc",
        category: "watch",
        categoryLabel: "Watch",
        headline: "Watch Bitcoin closely",
        detail: "Material move",
        href: "/portfolio",
      },
      {
        id: "review-conc",
        category: "review",
        categoryLabel: "Review",
        headline: "Bitcoin represents 69% of the portfolio.",
        detail: "Concentration",
        href: REVIEW_PATH,
      },
      {
        id: "goal-1",
        category: "goal",
        categoryLabel: "Goal",
        headline: "Goal path still intact",
        detail: "On track",
        href: DASHBOARD_DEEP_LINKS.goalProgress,
      },
    ]);

    const conclusion = buildPersonalIntelligenceConclusion({
      intelligence: stubIntelligence("elevated"),
      view: activeView(),
      calmer: inactiveCalmer(),
      actionPlan: plan,
      resilienceSensitivityName: "Bitcoin −20%",
    });

    expect(conclusion.isQuiet).toBe(false);
    expect(conclusion.primaryConclusion.toLowerCase()).toContain("bitcoin");
    expect(conclusion.primaryConclusion.toLowerCase()).toContain("main driver");
    expect(conclusion.attentionLine).toBeNull();
    expect(conclusion.ctaLabel).toBe("View today’s performance");
    expect(conclusion.ctaHref).toBe(DASHBOARD_DEEP_LINKS.portfolioPerformance);
    expect(conclusion.showFooterCta).toBe(false);
  });

  it("uses Explore scenarios for calmer days without a See why footer", () => {
    const conclusion = buildPersonalIntelligenceConclusion({
      intelligence: stubIntelligence("elevated"),
      view: activeView(),
      calmer: notableCalmer(),
      actionPlan: actionPlan([
        {
          id: "watch-btc",
          category: "watch",
          categoryLabel: "Watch",
          headline: "Watch Bitcoin closely",
          detail: "Material move",
          href: "/news",
        },
      ]),
    });

    expect(conclusion.ctaLabel).toBe("Explore scenarios");
    expect(conclusion.ctaHref).toBe(DASHBOARD_DEEP_LINKS.scenarioStress);
    expect(conclusion.showFooterCta).toBe(false);
    expect(conclusion.ctaLabel.toLowerCase()).not.toContain("see why");
  });

  it("caps Action Plan items at two distinct categories", () => {
    const plan = actionPlan([
      {
        id: "a",
        category: "watch",
        categoryLabel: "Watch",
        headline: "Watch A",
        detail: "d",
      },
      {
        id: "b",
        category: "watch",
        categoryLabel: "Watch",
        headline: "Watch B",
        detail: "d",
      },
      {
        id: "c",
        category: "review",
        categoryLabel: "Review",
        headline: "Review C",
        detail: "d",
      },
      {
        id: "d",
        category: "goal",
        categoryLabel: "Goal",
        headline: "Goal D",
        detail: "d",
      },
    ]);

    const selected = selectDashboardActionPlanItems(plan, {
      isQuiet: false,
      calmerActive: true,
    });
    expect(selected.length).toBeLessThanOrEqual(DASHBOARD_ACTION_PLAN_MAX_ITEMS);
    expect(selected).toHaveLength(2);
    expect(selected.map((item) => item.category)).toEqual(["watch", "review"]);
  });

  it("prioritizes Market Calmer headline when active", () => {
    const conclusion = buildPersonalIntelligenceConclusion({
      intelligence: stubIntelligence("elevated"),
      view: activeView(),
      calmer: notableCalmer(),
      actionPlan: actionPlan([]),
    });

    expect(conclusion.primaryConclusion.toLowerCase()).toContain("bitcoin");
    expect(conclusion.ctaHref).toBe(DASHBOARD_DEEP_LINKS.scenarioStress);
    expect(conclusion.ctaLabel).toBe("Explore scenarios");
    expect(conclusion.showFooterCta).toBe(false);
  });

  it("builds resilience and goal conclusions with deep links", () => {
    const resilience = buildResilienceConclusion({
      status: "ok",
      score: 49,
      bandId: "moderate",
      bandLabel: "Moderate",
      summary: "Moderate resilience.",
      factors: [],
      primaryDriver: "concentration",
      primaryDriverExplanation: "Concentration drives the score.",
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin −20%",
        estimatedPortfolioImpactPercent: -14,
        estimatedPortfolioImpactAmount: null,
        affectedPortfolioWeightPercent: 69,
        note: "note",
      },
      goalContext: null,
      scenarioResults: [],
      assumptions: [],
      limitations: [],
    } as ResilienceProfile);

    expect(resilience?.status).toContain("49 / 100");
    expect(resilience?.conclusion.toLowerCase()).toContain("bitcoin");
    expect(resilience?.ctaHref).toBe(DASHBOARD_DEEP_LINKS.scenarioStress);

    expect(
      buildResilienceConclusion({
        status: "insufficient_data",
        score: null,
      } as ResilienceProfile),
    ).toBeNull();

    const onTrack = buildGoalConclusion({
      hasGoal: true,
      goalReached: false,
      status: "On track",
      targetValue: 1_000_000,
      currentProgressPercent: 42,
      estimatedCompletionLabel: "2036",
      summary: "On track",
    } as GoalProgress);
    expect(onTrack?.status).toContain("€1M");
    expect(onTrack?.conclusion).toContain("2036");
    expect(onTrack?.ctaHref).toBe(DASHBOARD_DEEP_LINKS.goalProgress);

    expect(buildGoalConclusion({ hasGoal: false } as GoalProgress)).toBeNull();

    const behind = buildGoalConclusion({
      hasGoal: true,
      goalReached: false,
      status: "Slightly behind",
      targetValue: 1_000_000,
      currentProgressPercent: 30,
      estimatedCompletionLabel: "2040",
      summary: "Behind",
    } as GoalProgress);
    expect(behind?.status).toBe("Goal needs attention");
  });

  it("omits invented market relevance and keeps holdings compact", () => {
    const market = buildMarketConclusion({
      portfolioStatus: "Stable",
      leadTitle: null,
      quietMarket: true,
    });
    expect(market).toBeNull();

    const marketOk = buildMarketConclusion({
      portfolioStatus: "Watching",
      leadTitle:
        "US equities are stronger, but today’s market moves have limited impact on your portfolio.",
    });
    expect(marketOk?.ctaHref).toBe(DASHBOARD_DEEP_LINKS.marketBriefing);
    expect(marketOk?.conclusion.split(/\s+/).length).toBeLessThanOrEqual(22);

    const holdings = buildHoldingsConclusion({
      marketHoldings: [
        {
          id: "1",
          symbol: "BTC",
          name: "Bitcoin",
          portfolioWeightPercent: 69,
          dailyChangePercent: 1.2,
        },
        {
          id: "2",
          symbol: "IB1T",
          name: "IB1T",
          portfolioWeightPercent: 20,
          dailyChangePercent: 2.1,
        },
      ],
    } as DashboardPortfolioSnapshot);
    expect(holdings?.summaryLine).toContain("2 holdings");
    expect(holdings?.summaryLine).toContain("BTC");
    expect(holdings?.summaryLine).toContain("IB1T");
  });

  it("builds review conclusion without inventing pulse text", () => {
    const empty = buildReviewConclusion({ pulse: null, isQuietDay: false });
    expect(empty.conclusion.toLowerCase()).toContain("full review");
    expect(empty.ctaHref).toBe(REVIEW_PATH);

    const withPulse = buildReviewConclusion({
      isQuietDay: false,
      pulse: {
        combinedSummary:
          "This week: portfolio momentum improved, concentration remains unchanged.",
      } as PortfolioPulseResult,
    });
    expect(withPulse.conclusion.toLowerCase()).toContain("momentum");
  });
});
