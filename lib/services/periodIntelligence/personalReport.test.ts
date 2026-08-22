import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  buildChangeIntelligenceSummary,
  summarizeStoredChangeIntelligence,
} from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import { GOALS_PATH } from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  PERIOD_ADVICE_PATTERNS,
  PERIOD_CAUSAL_PATTERNS,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
  toPersonalReportViewModel,
} from "@/lib/services/periodIntelligence";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function listFiles(dir: string, suffix: string): string[] {
  const abs = path.resolve(process.cwd(), dir);
  return readdirSync(abs)
    .filter((name) => name.endsWith(suffix))
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

const resilienceProfile = {
  status: "ok" as const,
  score: 61,
  bandId: "moderate" as const,
  bandLabel: "Moderate",
  summary: "Moderate resilience",
  factors: [],
  primaryDriver: "concentration" as const,
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
};

function completeReview(kind: "weekly" | "monthly") {
  return applyPeriodIntelligenceDepth(
    buildPeriodIntelligenceReview({
      kind,
      companion: kind === "weekly" ? weeklyCompanion() : monthlyCompanion(),
      change: groupedChange(kind),
      snapshotCount: 2,
      concentrationWeightPercent: 52,
      largestHoldingName: "Bitcoin",
      resilienceProfile,
    }),
    "complete",
  );
}

function reportText(review: ReturnType<typeof completeReview>): string {
  return JSON.stringify(toPersonalReportViewModel(review));
}

function btcStoredHolding(): StoredPortfolioHolding {
  return {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    purchasePrice: 40_000,
    currentPrice: 52_000,
    currency: "EUR",
    assetType: "crypto",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  };
}

function perspectiveVideo(): PerspectiveVideo {
  return {
    id: "btc-macro",
    videoId: "btc-macro",
    title: "Why Bitcoin still dominates crypto liquidity",
    url: "https://www.youtube.com/watch?v=btc-macro",
    publishedAt: "2026-07-20T12:00:00.000Z",
    thumbnailUrl: null,
    description: null,
    channelId: "UCtest",
    channelTitle: "Coin Bureau",
    channelOwnerName: "Coin Bureau",
    creatorId: "coin-bureau",
    creatorName: "Coin Bureau",
    creatorAvatarUrl: null,
    trustedCreatorId: "coin-bureau",
    trustedCreatorName: "Coin Bureau",
    featuredPersonName: null,
    isTrustedSource: true,
    category: "bitcoin",
    categoryLabel: "Bitcoin",
    source: "youtube-rss",
    schemaVersion: "perspectives-identity-v2",
  };
}

describe("Phase 9A personal investment report", () => {
  it("1. weekly Complete report is a short performance + change + outlook review", () => {
    const review = completeReview("weekly");
    const view = toPersonalReportViewModel(review);
    expect(view.kicker).toBe("Your week");
    expect(view.depth).toBe("complete");
    expect(view.executiveSummary.length).toBeLessThanOrEqual(2);
    const happened = view.sections.find((row) => row.id === "happened");
    const changed = view.sections.find((row) => row.id === "changed");
    const ahead = view.sections.find((row) => row.id === "ahead");
    expect(happened?.evidence.length).toBeLessThanOrEqual(2);
    expect(happened?.whyItMatters).toBeNull();
    expect(changed?.evidence.length).toBeLessThanOrEqual(2);
    expect(ahead?.headline).toMatch(/sensitive|Bitcoin drawdown/i);
    expect(view.metrics.some((row) => row.id === "value-range")).toBe(false);
  });

  it("2. monthly Complete report is deeper and includes start/end plus goal", () => {
    const review = completeReview("monthly");
    const view = toPersonalReportViewModel(review);
    expect(view.kicker).toBe("Your month");
    expect(view.conclusion).toMatch(/Bitcoin|concentrat|dependent/i);
    expect(view.metrics.some((row) => row.id === "value-range")).toBe(true);
    expect(view.executiveSummary.length).toBeGreaterThan(1);
    expect(view.executiveSummary.length).toBeLessThanOrEqual(3);
    const changed = view.sections.find((row) => row.id === "changed");
    const goal = view.sections.find((row) => row.id === "goal");
    expect(changed?.evidence.length).toBeGreaterThan(
      toPersonalReportViewModel(completeReview("weekly")).sections.find(
        (row) => row.id === "changed",
      )?.evidence.length ?? 0,
    );
    expect(changed?.whyItMatters).toBeTruthy();
    expect(goal?.headline).toMatch(/Goal progress|12/i);
    expect(view.confidenceNotes.length).toBeGreaterThan(0);
  });

  it("3. weekly Free report keeps performance without exact change chains", () => {
    const view = toPersonalReportViewModel(
      applyPeriodIntelligenceDepth(completeReview("weekly"), "free"),
    );
    expect(view.depth).toBe("free");
    expect(view.kicker).toBe("Your week");
    expect(view.executiveSummary.length).toBeLessThanOrEqual(2);
    expect(view.executiveSummary.join(" ")).not.toMatch(/47% → 52%/);
    expect(view.sections.some((row) => row.id === "happened")).toBe(true);
    expect(view.sections.some((row) => row.id === "matters")).toBe(false);
    expect(view.sections.some((row) => row.id === "ahead")).toBe(false);
    expect(view.context).toBeNull();
    expect(view.confidenceNotes).toEqual([]);
    expect(view.completeTease).toBeTruthy();
  });

  it("4. monthly Free report stays useful and omits the premium chain", () => {
    const complete = completeReview("monthly");
    const view = toPersonalReportViewModel(
      applyPeriodIntelligenceDepth(complete, "free"),
    );
    expect(view.conclusion).toBe(complete.happened?.headline);
    expect(view.executiveSummary[0]).toMatch(/Euro cash was the largest detractor/i);
    expect(view.sections.find((row) => row.id === "changed")?.evidence).toEqual([]);
    expect(view.sections.find((row) => row.id === "changed")?.headline).not.toMatch(
      /47% → 52%/,
    );
    expect(view.sections.some((row) => row.id === "goal")).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/47% → 52%/);
  });

  it("5. first-history state uses the approved copy", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "weekly",
      companion: weeklyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: null,
        current: snapshot({ snapshotKind: "weekly", periodKey: "2026-W33" }),
      }),
      snapshotCount: 1,
    });
    const view = toPersonalReportViewModel(applyPeriodIntelligenceDepth(review, "complete"));
    expect(review.firstHistory).toBe(true);
    expect(view.sections.find((row) => row.id === "changed")?.headline).toBe(
      PERIOD_FIRST_HISTORY_COPY,
    );
    expect(view.sections.find((row) => row.id === "changed")?.href).toBeNull();
    expect(view.sections.some((row) => row.id === "matters")).toBe(false);
  });

  it("6. no-material-change state stays honest", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: snapshot({}),
        current: snapshot({
          id: "snap-2",
          periodKey: "2026-08",
          capturedAt: "2026-08-17T08:00:00.000Z",
        }),
      }),
      snapshotCount: 2,
    });
    const view = toPersonalReportViewModel(review);
    expect(view.sections.find((row) => row.id === "changed")?.headline).toBe(
      PERIOD_NO_MATERIAL_CHANGE_COPY,
    );
    expect(view.sections.some((row) => row.id === "matters")).toBe(false);
  });

  it("7. missing goal omits the goal section", () => {
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
      change: buildChangeIntelligenceSummary({
        previous: snapshot({ payload: { goal: null } }),
        current: snapshot({
          id: "snap-2",
          periodKey: "2026-08",
          payload: { goal: null },
        }),
      }),
      snapshotCount: 2,
    });
    const view = toPersonalReportViewModel(review);
    expect(view.sections.some((row) => row.id === "goal")).toBe(false);
    expect(view.sections.find((row) => row.id === "goal")?.href).toBeUndefined();
  });

  it("8. missing resilience omits looking-ahead comparison", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: snapshot({ payload: { resilience: null } }),
        current: snapshot({
          id: "snap-2",
          periodKey: "2026-08",
          payload: { resilience: null },
        }),
      }),
      snapshotCount: 2,
      resilienceProfile: null,
    });
    const view = toPersonalReportViewModel(review);
    expect(view.sections.some((row) => row.id === "ahead")).toBe(false);
    expect(JSON.stringify(toPersonalReportViewModel(review))).not.toMatch(
      /resilience score (improved|declined)/i,
    );
  });

  it("9. goal definition changed is not framed as performance", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: snapshot({}),
        current: snapshot({
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
        }),
      }),
      snapshotCount: 2,
    });
    const view = toPersonalReportViewModel(review);
    expect(view.sections.find((row) => row.id === "goal")?.headline).toMatch(
      /definition changed/i,
    );
    expect(JSON.stringify(view)).not.toMatch(/improved from/i);
  });

  it("10. quantity changed does not infer buy/sell", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: buildChangeIntelligenceSummary({
        previous: snapshot({ payload: { holdings: [btcHolding] } }),
        current: snapshot({
          id: "snap-2",
          periodKey: "2026-08",
          payload: {
            concentration: { largestHoldingWeightPercent: 52 },
            holdings: [
              { ...btcHolding, quantity: 1.25, value: 52_000, weightPercent: 52 },
            ],
          },
        }),
      }),
      snapshotCount: 2,
    });
    const view = toPersonalReportViewModel(review);
    const text = JSON.stringify(view);
    expect(text).toMatch(/quantity/i);
    expect(text).not.toMatch(/\bbought\b|\bsold\b|\bbuy\b|\bsell\b/i);
  });

  it("11. does not duplicate Bitcoin and crypto as separate stories", () => {
    const view = toPersonalReportViewModel(completeReview("monthly"));
    const changed = view.sections.find((row) => row.id === "changed");
    const blob = [changed?.headline, ...(changed?.evidence ?? [])].join("\n");
    expect(blob.match(/crypto exposure increased/gi) ?? []).toHaveLength(0);
    expect(blob).toMatch(/Bitcoin|concentrat/i);
    expect(view.sections.filter((row) => /Bitcoin|crypto/i.test(row.headline)).length).toBeLessThanOrEqual(
      3,
    );
  });

  it("12. context is omitted when the match is weak", () => {
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
    expect(toPersonalReportViewModel(review).context).toBeNull();
  });

  it("13. Perspective context is labeled as opinion", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: groupedChange("monthly"),
      snapshotCount: 2,
      largestHoldingName: "Bitcoin",
      holdings: [btcStoredHolding()],
      perspectiveVideos: [perspectiveVideo()],
      now: new Date("2026-08-17T12:00:00.000Z"),
    });
    expect(review.context?.kind).toBe("perspective");
    expect(review.context?.channelLabel).toBe("Perspective / opinion");
    expect(review.context?.detail).toMatch(/Perspective\/opinion/i);
    expect(toPersonalReportViewModel(review).context?.channelLabel).toBe(
      "Perspective / opinion",
    );
  });

  it("14. report copy never claims causality", () => {
    const text = reportText(completeReview("monthly"));
    for (const pattern of PERIOD_CAUSAL_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("15. report copy never advises buy, sell or rebalance", () => {
    const text = reportText(completeReview("monthly"));
    for (const pattern of PERIOD_ADVICE_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
    for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("16. report layout stays single-column first and paginate-safe", () => {
    const files = listFiles("components/report", ".tsx");
    expect(files.length).toBeGreaterThan(5);
    const joined = files.map((file) => read(file)).join("\n");
    expect(joined).toMatch(/grid-cols-1/);
    expect(joined).not.toMatch(/min-w-\[[6-9]\d{2,}/);
    expect(joined).not.toMatch(/w-screen|overflow-x-scroll/);
    expect(read("components/report/InAppReportRenderer.tsx")).toMatch(
      "toPersonalReportViewModel",
    );
  });

  it("17. renderer consumes PeriodIntelligenceReview without recalculating", () => {
    const mapping = read("lib/services/periodIntelligence/reportViewModel.ts");
    expect(mapping).toMatch("PeriodIntelligenceReview");
    expect(mapping).not.toMatch(
      /compareIntelligenceStates|buildChangeIntelligenceSummary|buildCompanionReview|buildResilienceProfile/,
    );
    expect(read("components/report/InAppReportRenderer.tsx")).toMatch(
      "PeriodIntelligenceReview",
    );
    expect(read("components/companion/PeriodIntelligenceReviewView.tsx")).toMatch(
      "InAppReportRenderer",
    );
    expect(read("lib/services/periodIntelligence/REPORT_RENDERER.md")).toMatch(
      /without recalculating/i,
    );
  });

  it("18. adds no EODHD, OpenAI, polling or news-fetch path", () => {
    const files = [
      ...listFiles("lib/services/periodIntelligence", ".ts"),
      ...listFiles("components/report", ".tsx"),
      "components/companion/PeriodIntelligenceReviewView.tsx",
      "components/companion/CompanionReviewPage.tsx",
      "components/companion/CompanionReviewPanel.tsx",
    ];
    for (const file of files) {
      if (file.endsWith(".test.ts")) continue;
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|setInterval|new cron|\/api\/news/i);
    }
  });

  it("saved monthly archive omits live change intelligence instead of faking first history", () => {
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion: monthlyCompanion(),
      change: summarizeStoredChangeIntelligence([]),
      snapshotCount: 0,
    });
    expect(review.firstHistory).toBe(false);
    expect(review.changed).toBeNull();
    expect(review.hero?.kicker).toBe("Your month");
    expect(toPersonalReportViewModel(review).sections.some((row) => row.id === "changed")).toBe(
      false,
    );
    expect(
      toPersonalReportViewModel(applyPeriodIntelligenceDepth(review, "free")).sections.some(
        (row) => row.id === "changed",
      ),
    ).toBe(false);
    expect(read("components/companion/CompanionReviewPage.tsx")).toMatch(
      "summarizeStoredChangeIntelligence([])",
    );
  });

  it("in-app sections keep existing explore destinations when present", () => {
    const view = toPersonalReportViewModel(completeReview("monthly"));
    expect(view.sections.find((row) => row.id === "happened")?.href).toBe(
      DASHBOARD_DEEP_LINKS.whatHappenedHub,
    );
    expect(view.sections.find((row) => row.id === "goal")?.href).toBe(GOALS_PATH);
    expect(view.sections.find((row) => row.id === "ahead")?.href).toBe(
      DASHBOARD_DEEP_LINKS.whatsAheadHub,
    );
    expect(read("lib/services/productAccess/types.ts")).toMatch("period_briefings");
    expect(read("lib/services/productAccess/types.ts")).toMatch("change_intelligence");
    expect(read("components/companion/CompanionReviewPage.tsx")).toMatch(
      "productAccess.intelligenceDepth",
    );
    expect(read("components/companion/CompanionPeriodTabs.tsx")).toMatch("Your week");
    expect(read("components/companion/CompanionPeriodTabs.tsx")).toMatch("Your month");
  });
});
