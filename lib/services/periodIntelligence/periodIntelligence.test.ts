import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { buildChangeIntelligenceSummary } from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import {
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
  PERIOD_ADVICE_PATTERNS,
  PERIOD_CAUSAL_PATTERNS,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
} from "@/lib/services/periodIntelligence";
import { resolveProductAccess } from "@/lib/services/productAccess";
import { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { NewsContentItem } from "@/lib/types/newsContent";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function listTs(dir: string): string[] {
  const abs = path.resolve(process.cwd(), dir);
  return readdirSync(abs)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => path.join(dir, name).replaceAll("\\", "/"));
}

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 2,
        valuedHoldingCount: 2,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 47,
      hhi: 0.35,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: 11.3,
      monthlyContribution: 500,
      expectedAnnualReturnPercent: 20,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 68,
      bandId: "balanced",
      bandLabel: "Balanced",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 40 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin drawdown",
        estimatedPortfolioImpactPercent: 18,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload> & {
      concentration?: Partial<IntelligenceStatePayload["concentration"]>;
      goal?: IntelligenceStatePayload["goal"];
      resilience?: IntelligenceStatePayload["resilience"];
      holdings?: IntelligenceStatePayload["holdings"];
      exposure?: IntelligenceStatePayload["exposure"];
    };
  },
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  const payload: IntelligenceStatePayload = {
    ...base,
    ...overrides.payload,
    portfolio: overrides.payload?.portfolio ?? base.portfolio,
    holdings: overrides.payload?.holdings ?? base.holdings,
    exposure: overrides.payload?.exposure ?? base.exposure,
    concentration: {
      ...base.concentration,
      ...overrides.payload?.concentration,
    },
    goal:
      overrides.payload && "goal" in overrides.payload
        ? overrides.payload.goal ?? null
        : base.goal,
    resilience:
      overrides.payload && "resilience" in overrides.payload
        ? overrides.payload.resilience ?? null
        : base.resilience,
    scorecard: overrides.payload?.scorecard ?? base.scorecard,
  };
  return {
    id: overrides.id ?? "snap-1",
    userId: overrides.userId ?? "user-1",
    portfolioId: overrides.portfolioId ?? "port-1",
    schemaVersion: 1,
    capturedAt: overrides.capturedAt ?? "2026-08-17T08:00:00.000Z",
    snapshotKind: overrides.snapshotKind ?? "monthly",
    periodKey: overrides.periodKey ?? "2026-07",
    periodStart: overrides.periodStart ?? "2026-07-01",
    periodEnd: overrides.periodEnd ?? "2026-07-31",
    timezone: overrides.timezone ?? "Europe/Amsterdam",
    payload,
  };
}

const btcHolding = {
  id: "btc",
  symbol: "BTC",
  name: "Bitcoin",
  quantity: 1,
  value: 47_000,
  weightPercent: 47,
  assetType: "crypto" as const,
  providerSymbol: "BTC-USD",
};

function points(values: Array<[string, number]>): PortfolioPerformancePoint[] {
  return values.map(([date, portfolioValue]) => ({
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  }));
}

function groupedChange(kind: "weekly" | "monthly" = "monthly") {
  const previous = snapshot({
    snapshotKind: kind,
    periodKey: kind === "weekly" ? "2026-W32" : "2026-07",
    periodStart: kind === "weekly" ? "2026-08-03" : "2026-07-01",
    periodEnd: kind === "weekly" ? "2026-08-09" : "2026-07-31",
    payload: {
      holdings: [btcHolding],
      exposure: {
        groups: [{ groupId: "crypto", displayLabel: "Crypto", weightPercent: 47 }],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });
  const current = snapshot({
    id: "snap-2",
    snapshotKind: kind,
    periodKey: kind === "weekly" ? "2026-W33" : "2026-08",
    periodStart: kind === "weekly" ? "2026-08-10" : "2026-08-01",
    periodEnd: kind === "weekly" ? "2026-08-16" : "2026-08-31",
    capturedAt: "2026-08-17T08:00:00.000Z",
    payload: {
      concentration: { largestHoldingWeightPercent: 52 },
      goal: {
        goalId: "goal-1",
        targetValue: 750_000,
        targetYear: 2035,
        progressPercent: 12,
        monthlyContribution: 500,
        expectedAnnualReturnPercent: 20,
        portfolioValueAvailable: true,
      },
      resilience: {
        status: "ok",
        score: 61,
        bandId: "moderate",
        bandLabel: "Moderate",
        primaryDriver: "concentration",
        factors: [{ id: "concentration", score: 32 }],
        mostSensitive: {
          scenarioId: "bitcoin_minus_20",
          scenarioName: "Bitcoin drawdown",
          estimatedPortfolioImpactPercent: 22,
        },
      },
      holdings: [{ ...btcHolding, value: 52_000, weightPercent: 52 }],
      exposure: {
        groups: [{ groupId: "crypto", displayLabel: "Crypto", weightPercent: 52 }],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });
  return buildChangeIntelligenceSummary({ previous, current });
}

function weeklyCompanion() {
  return buildCompanionReview("weekly", {
    now: new Date("2026-08-17T12:00:00.000Z"),
    holdingCount: 2,
    weekSeries: points([
      ["2026-08-11", 100_000],
      ["2026-08-17", 104_000],
    ]),
    weekBestHoldingName: "Bitcoin",
    weekWorstHoldingName: "Euro cash",
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 12,
    concentrationWeightPercent: 52,
  });
}

function monthlyCompanion() {
  return buildCompanionReview("monthly", {
    now: new Date("2026-08-17T12:00:00.000Z"),
    holdingCount: 2,
    monthSeries: points([
      ["2026-07-01", 96_000],
      ["2026-07-31", 100_000],
    ]),
    monthBestHoldingName: "Bitcoin",
    monthWorstHoldingName: "Euro cash",
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 12,
    concentrationWeightPercent: 52,
  });
}

function blob(review: ReturnType<typeof buildPeriodIntelligenceReview>): string {
  return JSON.stringify(review);
}

describe("Phase 8C PeriodIntelligenceReview", () => {
  it("1. weekly review with material concentration change", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "weekly",
      companion: weeklyCompanion(),
      change: groupedChange("weekly"),
      snapshotCount: 2,
      concentrationWeightPercent: 52,
      largestHoldingName: "Bitcoin",
    });
    expect(review.ready).toBe(true);
    expect(review.headline).toMatch(/Bitcoin|concentrat/i);
    expect(review.headline).toMatch(/week/i);
    expect(review.happened?.headline).toBeTruthy();
    expect(review.changed?.headline).toBeTruthy();
    expect(review.matters?.headline).toMatch(/dependent|risk|share/i);
  });

  it("2. monthly review groups concentration, exposure and resilience", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
      concentrationWeightPercent: 52,
      largestHoldingName: "Bitcoin",
    });
    expect(review.headline).toMatch(/month/i);
    const changed = `${review.changed?.headline} ${review.changed?.evidence.join(" ")} ${review.changed?.whyItMatters}`;
    expect(changed).toMatch(/47/i);
    expect(changed).toMatch(/52/i);
    expect(changed).toMatch(/crypto|resilience|61/i);
    expect(review.happened?.evidence.join(" ")).toMatch(/Starting|Ending|Portfolio value|contributor/i);
    expect(review.headline).not.toEqual(buildPeriodIntelligenceReview({
      kind: "weekly",
      companion: weeklyCompanion(),
      change: groupedChange("weekly"),
      snapshotCount: 2,
      concentrationWeightPercent: 52,
      largestHoldingName: "Bitcoin",
    }).headline);
  });

  it("3. goal improvement is surfaced when the definition is unchanged", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
    });
    expect(review.goal?.headline).toMatch(/Goal progress/i);
    expect(review.goal?.headline).not.toMatch(/definition changed/i);
  });

  it("4. goal definition changed is not framed as performance", () => {
    const previous = snapshot({});
    const current = snapshot({
      id: "snap-2",
      periodKey: "2026-08",
      payload: {
        goal: {
          goalId: "goal-1",
          targetValue: 900_000,
          targetYear: 2038,
          progressPercent: 10,
          monthlyContribution: 500,
          expectedAnnualReturnPercent: 20,
          portfolioValueAvailable: true,
        },
      },
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({ previous, current }),
      snapshotCount: 2,
    });
    expect(review.goal?.headline).toMatch(/definition changed/i);
    expect(review.goal?.headline).not.toMatch(/improved from/i);
  });

  it("5. quantity changed does not infer buy/sell", () => {
    const previous = snapshot({
      payload: { holdings: [btcHolding] },
    });
    const current = snapshot({
      id: "snap-2",
      periodKey: "2026-08",
      payload: {
        concentration: { largestHoldingWeightPercent: 52 },
        holdings: [{ ...btcHolding, quantity: 1.25, value: 52_000, weightPercent: 52 }],
      },
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({ previous, current }),
      snapshotCount: 2,
    });
    const text = blob(review);
    expect(text).toMatch(/quantity/i);
    expect(text).not.toMatch(/\bbought\b|\bsold\b|\bbuy\b|\bsell\b/i);
  });

  it("6. insufficient history uses the first-change copy", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "weekly",
      companion: weeklyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: null,
        current: snapshot({ snapshotKind: "weekly", periodKey: "2026-W33" }),
      }),
      snapshotCount: 1,
    });
    expect(review.firstHistory).toBe(true);
    expect(review.changed?.headline).toBe(PERIOD_FIRST_HISTORY_COPY);
    expect(review.matters).toBeNull();
  });

  it("7. two snapshots with no material change stay honest", () => {
    const previous = snapshot({});
    const current = snapshot({
      id: "snap-2",
      periodKey: "2026-08",
      capturedAt: "2026-08-17T08:00:00.000Z",
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({ previous, current }),
      snapshotCount: 2,
    });
    expect(review.noMaterialChange).toBe(true);
    expect(review.changed?.headline).toBe(PERIOD_NO_MATERIAL_CHANGE_COPY);
    expect(review.matters).toBeNull();
  });

  it("8. missing goal omits the goal section", () => {
    const previous = snapshot({ payload: { goal: null } });
    const current = snapshot({
      id: "snap-2",
      periodKey: "2026-08",
      payload: {
        goal: null,
        concentration: { largestHoldingWeightPercent: 52 },
        holdings: [{ ...btcHolding, weightPercent: 52, value: 52_000 }],
      },
    });
    const companion = buildCompanionReview("monthly", {
      now: new Date("2026-08-17T12:00:00.000Z"),
      holdingCount: 2,
      monthSeries: points([
        ["2026-07-01", 96_000],
        ["2026-07-31", 100_000],
      ]),
      hasSavedGoal: false,
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion,
      change: buildChangeIntelligenceSummary({ previous, current }),
      snapshotCount: 2,
    });
    expect(review.goal).toBeNull();
  });

  it("9. missing resilience omits resilience comparison and looking-ahead if nothing current exists", () => {
    const previous = snapshot({ payload: { resilience: null } });
    const current = snapshot({
      id: "snap-2",
      periodKey: "2026-08",
      payload: {
        resilience: null,
        concentration: { largestHoldingWeightPercent: 52 },
        holdings: [{ ...btcHolding, weightPercent: 52, value: 52_000 }],
      },
    });
    const companion = buildCompanionReview("monthly", {
      now: new Date("2026-08-17T12:00:00.000Z"),
      holdingCount: 2,
      monthSeries: points([
        ["2026-07-01", 96_000],
        ["2026-07-31", 100_000],
      ]),
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion,
      change: buildChangeIntelligenceSummary({ previous, current }),
      snapshotCount: 2,
      resilienceProfile: null,
    });
    expect(review.ahead).toBeNull();
    expect(blob(review)).not.toMatch(/resilience score (improved|declined)/i);
  });

  it("10. Free keeps a useful period answer without exact change chains", () => {
    const complete = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
      concentrationWeightPercent: 52,
      largestHoldingName: "Bitcoin",
    });
    const free = applyPeriodIntelligenceDepth(complete, "free");
    expect(free.headline).toBe(complete.happened?.headline);
    expect(free.changed?.headline).toBeTruthy();
    expect(free.changed?.evidence).toEqual([]);
    expect(free.matters).toBeNull();
    expect(free.ahead).toBeNull();
    expect(free.context).toBeNull();
    expect(free.completeTease).toMatch(/what changed/i);
    expect(free.headline).not.toMatch(/47% → 52%/);
  });

  it("11. Complete includes exact values, meaning and looking ahead", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion: monthlyCompanion(),
        change: groupedChange("monthly"),
        snapshotCount: 2,
        concentrationWeightPercent: 52,
        largestHoldingName: "Bitcoin",
        resilienceProfile: {
          status: "ok",
          score: 61,
          bandId: "moderate",
          bandLabel: "Moderate",
          summary: "Moderate resilience",
          factors: [],
          primaryDriver: "concentration",
          primaryDriverExplanation: null,
          mostSensitive: {
            scenarioId: "bitcoin_minus_20",
            scenarioName: "Bitcoin drawdown",
            estimatedPortfolioImpactPercent: 22,
            estimatedPortfolioImpactAmount: null,
            affectedPortfolioWeightPercent: 52,
            note: "",
          },
          goalContext: null,
          scenarioResults: [],
          assumptions: [],
          limitations: [],
        },
      }),
      "complete",
    );
    expect(review.changed?.evidence.join(" ")).toMatch(/47|52/);
    expect(review.matters?.headline).toBeTruthy();
    expect(review.ahead?.headline).toMatch(/sensitive|Bitcoin drawdown/i);
    expect(review.completeTease).toBeNull();
  });

  it("12. Complete trial uses Complete depth", () => {
    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      daysRemaining: 11,
      expiresAt: "2026-08-29T00:00:00.000Z",
      now: new Date("2026-08-18T12:00:00.000Z"),
    });
    expect(trial.isCompleteTrial).toBe(true);
    expect(trial.intelligenceDepth).toBe("complete");
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion: weeklyCompanion(),
        change: groupedChange("weekly"),
        snapshotCount: 2,
      }),
      trial.intelligenceDepth,
    );
    expect(review.intelligenceDepth).toBe("complete");
    expect(review.matters).not.toBeNull();
  });

  it("13. does not duplicate Bitcoin and crypto as separate headlines", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
      largestHoldingName: "Bitcoin",
    });
    const headlines = [
      review.headline,
      review.changed?.headline,
      review.matters?.headline,
      review.ahead?.headline,
    ]
      .filter(Boolean)
      .join("\n");
    const cryptoHeadlines = headlines.match(/crypto exposure increased/gi) ?? [];
    expect(cryptoHeadlines.length).toBe(0);
    expect(headlines).toMatch(/Bitcoin|concentrat/i);
  });

  it("14. never claims causality", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
    });
    const text = blob(review);
    for (const pattern of PERIOD_CAUSAL_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
    expect(text).toMatch(/coincided with|at the same time|alongside|also /i);
  });

  it("15. never advises buy, sell or rebalance", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
    });
    const text = blob(review);
    for (const pattern of PERIOD_ADVICE_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
    for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("16. report model has no React or UI dependency", () => {
    const files = listTs("lib/services/periodIntelligence");
    expect(files.length).toBeGreaterThan(3);
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/from ["']react["']/);
      expect(source).not.toMatch(/from ["']react-dom["']/);
      expect(source).not.toMatch(/jsx|tsx/i);
    }
    expect(read("lib/services/periodIntelligence/REPORT_RENDERER.md")).toMatch(
      /without recalculating/i,
    );
  });

  it("17. adds no EODHD, OpenAI, cron or polling path", () => {
    const files = [
      ...listTs("lib/services/periodIntelligence"),
      "components/companion/PeriodIntelligenceReviewView.tsx",
      "components/companion/CompanionReviewPage.tsx",
      "components/companion/CompanionReviewPanel.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|setInterval|new cron|\/api\/news/i);
    }
  });

  it("omits news when no excellent already-fetched context exists", () => {
    const weak: NewsContentItem = {
      id: "n1",
      title: "Markets mixed as investors wait",
      sourceName: "Unknown blog",
      sourceType: "news",
      canonicalUrl: "https://example.com/mixed",
      thumbnailUrl: null,
      publishedAt: "2026-07-15T12:00:00.000Z",
      description: "General markets",
      summary: "General markets",
      interpretation: "",
      impactLevel: "Low Impact",
      matchedHoldingIds: [],
      matchedSymbols: [],
      matchedHoldings: [],
      relevanceLabel: null,
      category: "general",
      marketCategory: "general",
      contentTypeLabel: "News",
      fetchedAt: "2026-08-17T12:00:00.000Z",
      relevanceScore: 2,
    };
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
      newsItems: [weak],
      holdings: [],
    });
    expect(review.context).toBeNull();
  });

  it("does not render period intelligence on daily companion reviews", () => {
    const panel = read("components/companion/CompanionReviewPanel.tsx");
    expect(panel).toMatch(/review\.period === "weekly" \|\| review\.period === "monthly"/);
    expect(panel).toMatch("PeriodIntelligenceReviewView");
    expect(read("components/companion/CompanionReviewPage.tsx")).toMatch(
      "buildPeriodIntelligenceReview",
    );
  });
});
