/**
 * Dashboard intelligence visual polish — presentation contracts only.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildPersonalIntelligenceConclusion,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildPersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import { buildPersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { MarketCalmerResult } from "@/lib/services/marketCalmer";
import type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

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

describe("Dashboard intelligence visual polish", () => {
  it("wires contextual primary CTAs and omits See why", () => {
    const source = read("components/dashboard/PortfolioThirtySeconds.tsx");
    expect(source).toContain("pi-primary-cta");
    expect(source).toContain("conclusion.ctaLabel");
    expect(source).not.toContain("See why");
    expect(source).toContain("HoldingSymbolChip");
    expect(source).toContain("NewsMediaThumbnail");
    expect(source).toContain('size="micro"');
    expect(source).toContain("hidden shrink-0 sm:inline-flex");
    expect(source).toContain("min-h-11");
    expect(source).not.toContain("overflow-x-auto");
  });

  it("uses verified story titles and holding-specific review copy", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "IB1T",
        quantity: 100,
        currentPrice: 100,
        previousClose: 100,
      }),
      holding({
        symbol: "VWCE",
        name: "VWCE",
        quantity: 10,
        currentPrice: 100,
        previousClose: 100,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    // Force concentration weights for the concentration candidate.
    const weights = valuedPositions.map((position) => ({
      symbol: position.holding.symbol,
      name: position.holding.name,
      weightPercent:
        position.holding.symbol === "IB1T" ? 69 : position.weightPercent,
    }));
    const intelligence = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: weights,
      intelligence: {
        portfolioStatus: "Elevated",
        portfolioSummary: "Material",
        todayMatters: [],
        holdingInsights: { positive: [], neutral: [], negative: ["IB1T"] },
        macroHighlights: [],
        mustWatch: {
          type: "article",
          itemId: "n1",
          title: "IB1T flows draw fresh attention",
          sourceName: "Example Wire",
          canonicalUrl: "https://example.com/story",
          reason: "Mentions IB1T.",
          thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        },
        keyRisks: [],
        opportunities: [],
        quietMarket: false,
        generatedAt: "2026-08-16T10:00:00.000Z",
      } satisfies InvestmentIntelligence,
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    const plan = buildPersonalActionPlan(intelligence);
    const watch = plan.items.find((item) => item.category === "watch");
    expect(watch?.headline).toContain("IB1T flows");
    expect(watch?.thumbnailUrl).toContain("ytimg.com");
    expect(watch?.sourceName).toBe("Example Wire");
    expect(watch?.visualKind).toBe("news");

    const review = plan.items.find(
      (item) => item.id === "action-review-concentration",
    );
    expect(review?.headline).toMatch(/IB1T represents \d+% of your portfolio/);
    expect(review?.entitySymbol).toBe("IB1T");
    expect(review?.href).toBe(DASHBOARD_DEEP_LINKS.portfolioExposure);
    expect(review?.visualKind).toBe("holding");
  });

  it("falls back to generic WATCH wording without inventing a title", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 40_000,
        change24hPercent: 0.1,
      }),
    ];
    const daily = summarizeDailyPerformance(holdings);
    const intelligence = buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: [{ symbol: "BTC", name: "Bitcoin", weightPercent: 100 }],
      intelligence: {
        portfolioStatus: "Watching",
        portfolioSummary: "Material",
        todayMatters: [],
        holdingInsights: { positive: [], neutral: [], negative: ["BTC"] },
        macroHighlights: [],
        mustWatch: {
          type: "article",
          itemId: "n2",
          title: "",
          sourceName: "Example",
          canonicalUrl: "https://example.com",
          reason: "Mentions BTC.",
          thumbnailUrl: null,
        },
        keyRisks: [],
        opportunities: [],
        quietMarket: false,
        generatedAt: "2026-08-16T10:00:00.000Z",
      } satisfies InvestmentIntelligence,
      now: new Date("2026-08-16T12:00:00.000Z"),
    });

    const watch = buildPersonalActionPlan(intelligence).items.find(
      (item) => item.category === "watch",
    );
    expect(watch?.headline).toBe(
      "A portfolio-linked development is worth monitoring",
    );
    expect(watch?.visualKind).toBe("holding");
  });

  it("keeps Goal micro-ring and skips Review sparkline", () => {
    const goal = read("components/dashboard/DashboardGoalConclusionCard.tsx");
    const review = read(
      "components/dashboard/DashboardReviewConclusionCard.tsx",
    );
    expect(goal).toContain("goal-progress-micro-ring");
    expect(review).not.toContain("HeroPerformanceSparkline");
    expect(review).not.toContain("sparkline");
  });

  it("surfaces primary contextual destination without duplicate footer CTA", () => {
    const view: ThirtySecondsBriefingView = {
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
    const calmer: MarketCalmerResult = {
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
    const plan = {
      version: "pi-action-v1" as const,
      isNoAction: false,
      items: [
        {
          id: "action-review-concentration",
          category: "review" as const,
          categoryLabel: "Review",
          headline: "IB1T represents 69% of your portfolio",
          detail: "detail",
          href: DASHBOARD_DEEP_LINKS.portfolioExposure,
        },
      ],
    };

    const conclusion = buildPersonalIntelligenceConclusion({
      intelligence: {
        generatedAt: "2026-01-01T00:00:00.000Z",
        version: "pi-today-v1",
        attention: "elevated",
        headline: "Active",
        portfolioMove: null,
        topContributors: [],
        topDetractors: [],
        holdingsWeights: [],
        exposure: null,
        news: null,
        goals: null,
        attentionItems: [],
        dataNotes: [],
      },
      view,
      calmer,
      actionPlan: plan,
    });

    expect(conclusion.ctaLabel).toBe("View today’s performance");
    expect(conclusion.showFooterCta).toBe(false);
    expect(
      selectDashboardActionPlanItems(plan, {
        isQuiet: false,
        calmerActive: false,
      }),
    ).toHaveLength(1);
  });
});
