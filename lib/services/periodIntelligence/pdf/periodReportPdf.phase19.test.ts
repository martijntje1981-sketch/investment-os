/**
 * Phase 19 — premium weekly/monthly PDF brief.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
} from "@/lib/services/periodIntelligence";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import { canDownloadPeriodReportPdf } from "@/lib/services/periodIntelligence/pdf/pdfAccess";
import { countPdfPages } from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import {
  buildPhase19PeriodReview,
  phase19ChartPoints,
  phase19ContributionEntries,
  phase19HoldingMoves,
  phase19Holdings,
  writePhase19ReviewPdfs,
} from "@/lib/services/periodIntelligence/pdf/phase19ReviewFixture";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import { resolveProductAccess } from "@/lib/services/productAccess";
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

describe("Phase 19 premium period report PDF", () => {
  it("A. weekly uses weekly period data", () => {
    const review = buildPhase19PeriodReview("weekly");
    expect(review.kind).toBe("weekly");
    expect(review.brief?.coverTitle).toBe("Your Weekly Review");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Your Weekly Review/);
    expect(text).toMatch(/11 Aug 2026|2026-08-11|This week|11–17/i);
  });

  it("B. monthly uses monthly period data", () => {
    const review = buildPhase19PeriodReview("monthly");
    expect(review.kind).toBe("monthly");
    expect(review.brief?.coverTitle).toBe("Your Monthly Review");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Your Monthly Review/);
    expect(review.brief?.showAllocation).toBe(true);
    expect(review.brief?.showHoldings).toBe(true);
  });

  it("C. Four Questions use canonical intelligence", () => {
    const weekly = buildPhase19PeriodReview("weekly");
    const text = extractPdfPlainText(renderPeriodReportPdf(weekly));
    for (const question of FOUR_QUESTIONS) {
      if (question.id === "am_i_on_track" && weekly.goal) {
        expect(text).toMatch(/AM I ON TRACK/);
      }
      if (question.id === "what_happened") {
        expect(text).toMatch(/WHAT HAPPENED/);
        expect(weekly.happened?.headline).toBeTruthy();
      }
    }
    expect(read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts")).toMatch(
      "toPersonalReportViewModel",
    );
    expect(read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts")).not.toMatch(
      /buildChangeIntelligenceSummary|buildCompanionReview|buildResilienceProfile|buildGoalProgressEngine/,
    );
  });

  it("D. contributor chart uses portfolio impact", () => {
    const review = buildPhase19PeriodReview("weekly");
    const btc = review.brief?.contributors.find((row) => row.symbol === "BTC");
    expect(btc?.contributionPp).toBeCloseTo(4, 5);
    expect(btc?.contributionPpLabel).toBe("+4.0pp");
    expect(btc?.holdingMoveLabel).toMatch(/\+/);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/TOP CONTRIBUTORS/);
    expect(text).toMatch(/\+4\.0pp/);
    expect(text).toMatch(/portfolio impact/);
  });

  it("E/F/G. allocation chart uses Phase 17 groups, precious metals, unclassified", () => {
    const review = buildPhase19PeriodReview("monthly");
    const ids = review.brief?.allocation.map((row) => row.groupId) ?? [];
    expect(ids).toContain("crypto");
    expect(ids).toContain("cash");
    expect(ids).toContain("fixed_income");
    expect(ids).toContain("precious_metals");
    expect(ids).toContain("other_unclassified");
    const metals = review.brief?.allocation.find((row) => row.groupId === "precious_metals");
    const other = review.brief?.allocation.find((row) => row.groupId === "other_unclassified");
    expect(metals?.label).toBe("Precious metals");
    expect(other?.label).toBe("Other / Unclassified");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Precious metals/);
    expect(text).toMatch(/Other \/ Unclassified/);
  });

  it("H/I. scenario chart uses modeled results only and is labelled", () => {
    const review = buildPhase19PeriodReview("monthly");
    expect(review.brief?.showScenarios).toBe(true);
    expect(review.brief?.scenarios.every((row) =>
      ["bitcoin_minus_20", "crypto_minus_20", "global_equities_minus_20"].includes(
        row.scenarioId,
      ),
    )).toBe(true);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/MODELED SCENARIO/);
    expect(text).toMatch(/NOT FORECAST/);
    expect(text).not.toMatch(/gold -20%|silver -20%|rates scenario/i);
  });

  it("J. goal chart uses existing goal engine", () => {
    const review = buildPhase19PeriodReview("monthly");
    expect(review.brief?.goal.hasGoal).toBe(true);
    if (review.brief?.goal.hasGoal) {
      expect(review.brief.goal.progressPercent).toBeGreaterThan(0);
      expect(review.brief.goal.targetLabel).toMatch(/250/);
    }
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/GOAL PROGRESS/);
    expect(text).toMatch(/% of target/);
  });

  it("K. no goal → no fake chart", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion: buildCompanionReview("monthly", {
          now: new Date("2026-08-17T12:00:00.000Z"),
          holdingCount: 2,
          monthSeries: points([
            ["2026-07-01", 96_000],
            ["2026-07-31", 100_000],
          ]),
          hasSavedGoal: false,
        }),
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        hasSavedGoal: false,
        holdings: [],
      }),
      "complete",
    );
    expect(review.brief?.goal.hasGoal).toBe(false);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Add a goal in Tobailey/);
    expect(text).not.toMatch(/GOAL PROGRESS/);
    expect(text).not.toMatch(/% of target/);
  });

  it("L/M. contribution uses Phase 18 funding history without fake lifetime return", () => {
    const review = buildPhase19PeriodReview("weekly");
    expect(phase19ContributionEntries("weekly")[0]?.baseAmount).toBe(400);
    expect(review.brief?.funding?.periodActivityLabel).toMatch(/Recorded contribution €400|Recorded contribution EUR 400/);
    expect(review.brief?.funding?.coverageNote).toBe(INCOMPLETE_HISTORY_NOTE);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Recorded contribution €400|Recorded contribution EUR 400/);
    expect(text).toMatch(/Contribution history may be incomplete/);
    expect(text).not.toMatch(/lifetime (return|gain|performance)/i);
    expect(text).not.toMatch(/value above contributions/i);
  });

  it("N. price status semantics preserved", () => {
    const review = buildPhase19PeriodReview("monthly");
    const statuses = review.brief?.holdings.map((row) => row.statusLabel) ?? [];
    expect(statuses).toContain("Delayed");
    expect(statuses).toContain("Last session");
    expect(statuses).toContain("Current");
    expect(statuses).not.toContain("Live");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).not.toMatch(/\bLive\b/);
    expect(text).toMatch(/Delayed|Last session|Current|Price unavailable/);
  });

  it("O. sparse history → no fake performance line", () => {
    const sparse = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion: buildCompanionReview("weekly", {
          now: new Date("2026-08-17T12:00:00.000Z"),
          holdingCount: 2,
          weekSeries: points([["2026-08-17", 104_000]]),
        }),
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        chartPoints: points([["2026-08-17", 104_000]]),
        holdings: phase19Holdings(),
      }),
      "complete",
    );
    expect(sparse.brief?.performanceChart).toBeNull();
  });

  it("P. PDF page overflow guards stay within a useful page count", () => {
    const weekly = renderPeriodReportPdf(buildPhase19PeriodReview("weekly"));
    const monthly = renderPeriodReportPdf(buildPhase19PeriodReview("monthly"));
    const weeklyPages = countPdfPages(weekly);
    const monthlyPages = countPdfPages(monthly);
    expect(weeklyPages).toBeGreaterThanOrEqual(2);
    expect(weeklyPages).toBeLessThanOrEqual(8);
    expect(monthlyPages).toBeGreaterThanOrEqual(3);
    expect(monthlyPages).toBeLessThanOrEqual(12);
    expect(weeklyPages).toBeLessThanOrEqual(monthlyPages);
  });

  it("Q. existing PDF endpoint still works", () => {
    const route = read("app/api/review/pdf/route.ts");
    expect(route).toMatch("renderPeriodReportPdf");
    expect(route).toMatch("isPeriodIntelligenceReview");
    expect(route).toMatch("POST");
  });

  it("R. Complete gating unchanged", () => {
    const free = resolveProductAccess({ exampleKind: "none" });
    const complete = resolveProductAccess({ exampleKind: "converted" });
    expect(canDownloadPeriodReportPdf(free)).toBe(false);
    expect(canDownloadPeriodReportPdf(complete)).toBe(true);
    expect(read("lib/services/periodIntelligence/pdf/pdfAccess.ts")).toMatch(
      "period_briefings",
    );
  });

  it("S. archived monthly path unchanged", () => {
    expect(read("lib/services/periodIntelligence/pdf/archivedMonthlyReview.ts")).toMatch(
      "summarizeStoredChangeIntelligence([])",
    );
    expect(read("app/api/review/monthly/[yearMonth]/pdf/route.ts")).toMatch(
      "buildArchivedMonthlyPeriodIntelligenceReview",
    );
  });

  it("T. no new paid API, provider, OpenAI, DB, cron, or polling", () => {
    const files = [
      ...listPdfFiles(),
      "lib/services/periodIntelligence/buildPeriodReportBrief.ts",
      "lib/services/periodIntelligence/periodReportBrief.ts",
      "app/api/review/pdf/route.ts",
      "app/api/review/monthly/[yearMonth]/pdf/route.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(
        /eodhd|openai|setInterval|new cron|puppeteer|playwright|chart\.js|quickchart|googleapis/i,
      );
    }
  });

  it("weekly stays more concise than monthly", () => {
    const weekly = buildPhase19PeriodReview("weekly");
    const monthly = buildPhase19PeriodReview("monthly");
    expect(weekly.brief?.showAllocation).toBe(false);
    expect(monthly.brief?.showAllocation).toBe(true);
    expect(weekly.brief?.showScenarios).toBe(false);
    expect(monthly.brief?.showScenarios).toBe(true);
    expect(weekly.brief?.showHoldings).toBe(false);
    expect(monthly.brief?.showHoldings).toBe(true);
  });

  it("writes local representative PDFs through the real renderer", () => {
    const { weeklyPath, monthlyPath } = writePhase19ReviewPdfs();
    expect(existsSync(weeklyPath)).toBe(true);
    expect(existsSync(monthlyPath)).toBe(true);
    expect(phase19ChartPoints("weekly").length).toBeGreaterThan(2);
    expect(phase19HoldingMoves().length).toBe(phase19Holdings().length);
  });
});
