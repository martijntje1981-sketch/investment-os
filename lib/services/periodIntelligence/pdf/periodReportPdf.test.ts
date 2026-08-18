/**
 * Phase 9B — canonical weekly/monthly PDF from PeriodIntelligenceReview.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildChangeIntelligenceSummary,
  summarizeStoredChangeIntelligence,
} from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import {
  PERIOD_ADVICE_PATTERNS,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
  type BuildPeriodIntelligenceReviewInput,
} from "@/lib/services/periodIntelligence";
import {
  buildArchivedMonthlyPeriodIntelligenceReview,
  canDownloadPeriodReportPdf,
  extractPdfPlainText,
  periodReportPdfFilename,
  renderPeriodReportPdf,
  resolvePeriodReportPdfAccess,
} from "@/lib/services/periodIntelligence/pdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";
import { resolveProductAccess } from "@/lib/services/productAccess";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function listPdfFiles(): string[] {
  const dir = path.resolve(process.cwd(), "lib/services/periodIntelligence/pdf");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => `lib/services/periodIntelligence/pdf/${name}`);
}

function points(values: Array<[string, number]>): PortfolioPerformancePoint[] {
  return values.map(([date, portfolioValue]) => ({
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  }));
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
      groups: [
        {
          groupId: "fixed_income",
          displayLabel: "Fixed income",
          weightPercent: 24,
        },
      ],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "bnd",
      largestHoldingSymbol: "AGGH",
      largestHoldingName: "Global Aggregate Bond ETF",
      largestHoldingWeightPercent: 24,
      hhi: 0.2,
      concentrationLevel: "balanced",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 250_000,
      targetYear: 2035,
      progressPercent: 40,
      monthlyContribution: 400,
      expectedAnnualReturnPercent: 6,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 70,
      bandId: "balanced",
      bandLabel: "Balanced",
      primaryDriver: "diversification",
      factors: [{ id: "diversification", score: 70 }],
      mostSensitive: {
        scenarioId: "global_equities_minus_20",
        scenarioName: "Global equities -20%",
        estimatedPortfolioImpactPercent: 12,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload>;
  } = {},
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  return {
    id: overrides.id ?? "snap-1",
    userId: "user-1",
    portfolioId: "p1",
    snapshotKind: overrides.snapshotKind ?? "monthly",
    schemaVersion: 1,
    periodKey: overrides.periodKey ?? "2026-07",
    periodStart: overrides.periodStart ?? "2026-07-01",
    periodEnd: overrides.periodEnd ?? "2026-07-31",
    capturedAt: overrides.capturedAt ?? "2026-08-01T08:00:00.000Z",
    timezone: "Europe/Amsterdam",
    payload: {
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
      resilience: overrides.payload?.resilience ?? base.resilience,
      scorecard: overrides.payload?.scorecard ?? null,
    },
  };
}

function fiChange() {
  const previous = snapshot({
    periodKey: "2026-07",
    payload: {
      exposure: {
        groups: [
          {
            groupId: "diversified_equity",
            displayLabel: "Diversified equity",
            weightPercent: 82,
          },
          {
            groupId: "fixed_income",
            displayLabel: "Fixed income",
            weightPercent: 18,
          },
        ],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });
  const current = snapshot({
    id: "snap-2",
    periodKey: "2026-08",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    capturedAt: "2026-08-17T08:00:00.000Z",
    payload: {
      exposure: {
        groups: [
          {
            groupId: "diversified_equity",
            displayLabel: "Diversified equity",
            weightPercent: 76,
          },
          {
            groupId: "fixed_income",
            displayLabel: "Fixed income",
            weightPercent: 24,
          },
        ],
        subgroups: [
          {
            parentGroupId: "fixed_income",
            subgroupId: "fi_government",
            displayLabel: "Government",
            weightPercent: 14,
          },
          {
            parentGroupId: "fixed_income",
            subgroupId: "fi_corporate",
            displayLabel: "Corporate",
            weightPercent: 10,
          },
        ],
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
  });
}

function monthlyCompanion(hasGoal = true) {
  return buildCompanionReview("monthly", {
    now: new Date("2026-08-17T12:00:00.000Z"),
    holdingCount: 2,
    monthSeries: points([
      ["2026-07-01", 96_000],
      ["2026-07-31", 100_000],
    ]),
    monthBestHoldingName: "iShares Core Global Aggregate Bond UCITS ETF",
    monthWorstHoldingName: "Euro cash",
    hasSavedGoal: hasGoal,
    goalStatus: hasGoal ? "On track" : null,
    goalProgressPercent: hasGoal ? 40 : null,
  });
}

const resilienceProfile = {
  status: "ok" as const,
  score: 70,
  bandId: "balanced" as const,
  bandLabel: "Balanced",
  summary: "Balanced",
  factors: [],
  primaryDriver: "diversification" as const,
  primaryDriverExplanation: null,
  mostSensitive: {
    scenarioId: "global_equities_minus_20" as const,
    scenarioName: "Global equities -20%",
    estimatedPortfolioImpactPercent: 12,
    estimatedPortfolioImpactAmount: null,
    affectedPortfolioWeightPercent: 45,
    note: "",
  },
  goalContext: null,
  scenarioResults: [],
  assumptions: [],
  limitations: [
    "Fixed income is classified when identifiable, but interest-rate and credit shocks are not numerically modeled without reliable duration or credit inputs.",
  ],
};

function completeReview(
  kind: "weekly" | "monthly",
  extras: Partial<BuildPeriodIntelligenceReviewInput> = {},
): PeriodIntelligenceReview {
  const built = buildPeriodIntelligenceReview({
    kind,
    companion: kind === "weekly" ? weeklyCompanion() : monthlyCompanion(),
    change: fiChange(),
    snapshotCount: 2,
    intelligenceDepth: "complete",
    resilienceProfile,
    ...extras,
  });
  return applyPeriodIntelligenceDepth(built, "complete");
}

function pdfText(review: PeriodIntelligenceReview): string {
  return extractPdfPlainText(renderPeriodReportPdf(review));
}

const completeAccess = resolveProductAccess({ exampleKind: "converted" });
const freeAccess = resolveProductAccess({ exampleKind: "none" });
const trialAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "personal",
  daysRemaining: 11,
  expiresAt: "2026-08-29T00:00:00.000Z",
});
const demoAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "demo",
  daysRemaining: 8,
  expiresAt: "2026-08-26T00:00:00.000Z",
});

describe("Phase 9B period report PDF", () => {
  it("1. weekly Complete PDF renders the canonical week review", () => {
    const review = completeReview("weekly");
    const bytes = renderPeriodReportPdf(review);
    const text = extractPdfPlainText(bytes);
    expect(Buffer.from(bytes).toString("latin1")).toContain("%PDF");
    expect(text).toMatch(/TOBAILEY/);
    expect(text).toMatch(/Your personal investment review/);
    expect(text).toMatch(/YOUR WEEK/);
    expect(text).toMatch(/At a glance/);
    expect(text).toMatch(/WHAT HAPPENED/);
    expect(review.intelligenceDepth).toBe("complete");
  });

  it("2. monthly Complete PDF is a fuller month review", () => {
    const review = completeReview("monthly");
    const text = pdfText(review);
    expect(text).toMatch(/YOUR MONTH/);
    expect(text).toMatch(/Portfolio value|Investment return|At a glance/);
    expect(text.split("WHAT").length).toBeGreaterThan(2);
  });

  it("3. Free PDF access is blocked", () => {
    expect(canDownloadPeriodReportPdf(freeAccess)).toBe(false);
    expect(
      resolvePeriodReportPdfAccess({
        access: freeAccess,
        reviewReady: true,
        reviewIsDemo: false,
      }).allowed,
    ).toBe(false);
    expect(read("components/report/PeriodReportPdfAction.tsx")).toMatch(
      "PDF download is included with Complete",
    );
    expect(read("components/report/PeriodReportPdfAction.tsx")).not.toMatch(
      "disabled={!canDownload",
    );
  });

  it("4. Complete Trial PDF is allowed", () => {
    expect(trialAccess.isCompleteTrial).toBe(true);
    expect(canDownloadPeriodReportPdf(trialAccess)).toBe(true);
    expect(
      resolvePeriodReportPdfAccess({
        access: trialAccess,
        reviewReady: true,
        reviewIsDemo: false,
      }).allowed,
    ).toBe(true);
  });

  it("5. archived monthly PDF uses the saved snapshot", () => {
    const payload: MonthlyReviewSnapshotPayload = {
      schemaVersion: 1,
      review: monthlyCompanion(),
      metrics: monthlyCompanion().metrics!,
    };
    const archived = buildArchivedMonthlyPeriodIntelligenceReview(payload);
    expect(archived.kind).toBe("monthly");
    expect(archived.changed).toBeNull();
    const text = pdfText(archived);
    expect(text).toMatch(/YOUR MONTH/);
    expect(text).not.toMatch(/WHAT CHANGED/);
  });

  it("6. archived report does not mix live Change Intelligence", () => {
    const live = completeReview("monthly");
    const payload: MonthlyReviewSnapshotPayload = {
      schemaVersion: 1,
      review: monthlyCompanion(),
      metrics: monthlyCompanion().metrics!,
    };
    const archived = buildArchivedMonthlyPeriodIntelligenceReview(payload);
    const liveHeadline = live.changed?.headline ?? "";
    expect(liveHeadline.length).toBeGreaterThan(0);
    expect(archived.changed).toBeNull();
    expect(pdfText(archived)).not.toContain(liveHeadline.slice(0, 24));
    expect(read("lib/services/periodIntelligence/pdf/archivedMonthlyReview.ts")).toMatch(
      "summarizeStoredChangeIntelligence([])",
    );
    expect(read("app/api/review/monthly/[yearMonth]/pdf/route.ts")).toMatch(
      "buildArchivedMonthlyPeriodIntelligenceReview",
    );
  });

  it("7. first-history state stays honest in the PDF", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion: weeklyCompanion(),
        change: buildChangeIntelligenceSummary({
          previous: null,
          current: snapshot({ snapshotKind: "weekly", periodKey: "2026-W33" }),
        }),
        snapshotCount: 1,
      }),
      "complete",
    );
    expect(pdfText(review)).toContain(
      PERIOD_FIRST_HISTORY_COPY.replace(/[^\x20-\x7E]/g, "?").slice(0, 40),
    );
  });

  it("8. no-material-change state stays honest in the PDF", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion: monthlyCompanion(),
        change: buildChangeIntelligenceSummary({
          previous: snapshot({ periodKey: "2026-07" }),
          current: snapshot({
            id: "snap-2",
            periodKey: "2026-08",
            payload: {
              exposure: emptyPayload().exposure,
              concentration: emptyPayload().concentration,
              goal: emptyPayload().goal,
              resilience: emptyPayload().resilience,
            },
          }),
        }),
        snapshotCount: 2,
      }),
      "complete",
    );
    const text = pdfText(review);
    if (review.noMaterialChange) {
      expect(text).toContain(PERIOD_NO_MATERIAL_CHANGE_COPY.slice(0, 28));
    }
    expect(text).not.toMatch(/invented|estimated previous/i);
  });

  it("9. missing goal omits a fabricated on-track section", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion: monthlyCompanion(false),
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
      }),
      "complete",
    );
    expect(review.goal).toBeNull();
    expect(pdfText(review)).not.toMatch(/AM I ON TRACK/);
  });

  it("10. missing resilience omits a fabricated outlook", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion: weeklyCompanion(),
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        resilienceProfile: null,
        concentrationWeightPercent: null,
      }),
      "complete",
    );
    expect(review.ahead).toBeNull();
    expect(pdfText(review)).not.toMatch(/LOOKING AHEAD/);
  });

  it("11. fixed-income exposure renders when the canonical review includes it", () => {
    const review = completeReview("monthly");
    const blob = [
      review.changed?.headline,
      ...(review.changed?.evidence ?? []),
      pdfText(review),
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/fixed income/);
  });

  it("12. inferred fixed-income metadata is not shown as confirmed", () => {
    const text = pdfText(completeReview("monthly"));
    expect(text).not.toMatch(/confirmed duration|confirmed yield|confirmed credit/i);
  });

  it("13. does not invent duration or yield", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion: monthlyCompanion(),
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
      }),
      "complete",
    );
    const text = pdfText(review);
    expect(text).not.toMatch(/\byield\b/i);
    expect(text).not.toMatch(/\bduration\b/i);
    expect(text).not.toMatch(/\bcoupon\b/i);
    expect(read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts")).not.toMatch(
      /classifyFixedIncome|durationBucket|creditQuality/,
    );
  });

  it("14. Perspective is labeled as opinion", () => {
    const review: PeriodIntelligenceReview = {
      ...completeReview("monthly"),
      context: {
        kind: "perspective",
        channelLabel: "Perspective / opinion",
        headline: "Why Bitcoin still dominates crypto liquidity",
        detail: "Perspective/opinion from a trusted creator — not a news fact.",
        href: null,
        hrefExternal: false,
      },
    };
    const text = pdfText(review);
    expect(text).toMatch(/Perspective \/ opinion/);
    expect(text).not.toMatch(/confirmed news fact/i);
  });

  it("15. PDF copy does not advise buy, sell or rebalance", () => {
    const text = pdfText(completeReview("monthly"));
    for (const pattern of PERIOD_ADVICE_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("16. authenticated ownership guard", () => {
    const live = read("app/api/review/pdf/route.ts");
    const archived = read("app/api/review/monthly/[yearMonth]/pdf/route.ts");
    expect(live).toMatch("getUser");
    expect(live).toMatch('if ("user_id" in body');
    expect(archived).toMatch("getUser");
    expect(archived).toMatch("user.id");
    expect(archived).toMatch("getMonthlyReviewSnapshot");
    expect(archived).not.toMatch("body.user_id");
  });

  it("17. demo isolation", () => {
    expect(
      resolvePeriodReportPdfAccess({
        access: demoAccess,
        reviewReady: true,
        reviewIsDemo: true,
      }).allowed,
    ).toBe(true);
    expect(
      resolvePeriodReportPdfAccess({
        access: demoAccess,
        reviewReady: true,
        reviewIsDemo: false,
      }).reason,
    ).toBe("demo_mix");
    expect(
      resolvePeriodReportPdfAccess({
        access: completeAccess,
        reviewReady: true,
        reviewIsDemo: true,
      }).reason,
    ).toBe("demo_mix");
  });

  it("18. predictable filename", () => {
    const weekly = completeReview("weekly");
    const monthly = completeReview("monthly");
    expect(periodReportPdfFilename(weekly)).toMatch(
      /^tobailey-weekly-review-\d{4}-W\d{2}\.pdf$/,
    );
    expect(periodReportPdfFilename(monthly)).toMatch(
      /^tobailey-monthly-review-\d{4}-\d{2}\.pdf$/,
    );
  });

  it("19. renderer consumes canonical PeriodIntelligenceReview", () => {
    const renderer = read(
      "lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts",
    );
    expect(renderer).toMatch("toPersonalReportViewModel");
    expect(renderer).toMatch("PeriodIntelligenceReview");
    expect(renderer).not.toMatch(
      /compareIntelligenceStates|buildChangeIntelligenceSummary|buildCompanionReview|buildResilienceProfile|classifyFixedIncome/,
    );
    expect(read("lib/services/periodIntelligence/REPORT_RENDERER.md")).toMatch(
      "renderPeriodReportPdf",
    );
  });

  it("20. adds no EODHD, OpenAI, or polling path", () => {
    const files = [
      ...listPdfFiles(),
      "app/api/review/pdf/route.ts",
      "app/api/review/monthly/[yearMonth]/pdf/route.ts",
      "components/report/PeriodReportPdfAction.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|setInterval|new cron|puppeteer|playwright/i);
    }
  });
});
