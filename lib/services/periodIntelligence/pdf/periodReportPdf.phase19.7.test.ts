/**
 * Phase 19.7 — monthly available-history label, weekly goal snapshot label,
 * and canonical price-status consumption in reports/export.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import {
  availablePortfolioHistoryLabel,
  clipChartPointsToPeriod,
} from "@/lib/services/periodIntelligence/buildPeriodReportBrief";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    purchasePrice: overrides.purchasePrice ?? overrides.currentPrice,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    priceDataStatus: overrides.priceDataStatus ?? "stale",
    ...overrides,
  };
}

const NOW = new Date("2026-08-20T12:00:00.000Z");
const JULY_START = 120_317;
const JULY_END = 119_562;
const LIVE_NOW = 127_526;
const WEEK_START = 120_820;
const WEEK_END = 125_022;

const GOAL: GoalSettings = {
  name: "Retirement",
  targetValue: 250_000,
  targetYear: 2035,
  monthlyContribution: 400,
  expectedAnnualReturn: 6,
};

function liveCash(value: number): StoredPortfolioHolding[] {
  return [
    holding({
      id: "live-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: value,
      currentPrice: 1,
      assetType: "cash",
    }),
  ];
}

function composeMonthly(chartPoints: Array<{ date: string; portfolioValue: number }>) {
  const holdings = liveCash(LIVE_NOW);
  const companion = buildCompanionReview("monthly", {
    now: NOW,
    holdingCount: holdings.length,
    monthSeries: chartPoints.map((point) => ({
      date: point.date,
      portfolioValue: point.portfolioValue,
      netContributions: null,
      investmentReturn: null,
    })),
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 50,
  });
  return applyPeriodIntelligenceDepth(
    buildPeriodIntelligenceReview({
      kind: "monthly",
      companion,
      change: summarizeStoredChangeIntelligence([]),
      snapshotCount: 0,
      intelligenceDepth: "complete",
      holdings,
      goal: GOAL,
      hasSavedGoal: true,
      chartPoints: chartPoints.map((point) => ({
        date: point.date,
        portfolioValue: point.portfolioValue,
        netContributions: null,
        investmentReturn: null,
      })),
      startingPortfolioValue: JULY_START,
      endingPortfolioValue: LIVE_NOW,
      currentPortfolioValue: LIVE_NOW,
      now: NOW,
    }),
    "complete",
  );
}

function composeWeekly() {
  const holdings = liveCash(LIVE_NOW);
  const weekSeries = [
    {
      date: "2026-08-14",
      portfolioValue: WEEK_START,
      netContributions: null,
      investmentReturn: null,
    },
    {
      date: "2026-08-20",
      portfolioValue: WEEK_END,
      netContributions: null,
      investmentReturn: null,
    },
  ];
  const companion = buildCompanionReview("weekly", {
    now: NOW,
    holdingCount: holdings.length,
    weekSeries,
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 50,
  });
  return applyPeriodIntelligenceDepth(
    buildPeriodIntelligenceReview({
      kind: "weekly",
      companion,
      change: summarizeStoredChangeIntelligence([]),
      snapshotCount: 0,
      intelligenceDepth: "complete",
      holdings,
      goal: GOAL,
      hasSavedGoal: true,
      chartPoints: weekSeries,
      startingPortfolioValue: WEEK_START,
      endingPortfolioValue: WEEK_END,
      currentPortfolioValue: LIVE_NOW,
      now: NOW,
    }),
    "complete",
  );
}

describe("Phase 19.7 report clarity", () => {
  it("A. partial Monthly chart history shows Available portfolio history", () => {
    const review = composeMonthly([
      { date: "2026-07-20", portfolioValue: 118_000 },
      { date: "2026-07-31", portfolioValue: JULY_END },
    ]);
    expect(review.brief?.performanceChart?.availableHistoryLabel).toBe(
      "Available portfolio history: 20 Jul – 31 Jul",
    );
    expect(review.period.startDate).toBe("2026-07-01");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Available portfolio history: 20 Jul [–-] 31 Jul/);
  });

  it("B. full-period history does not show the available-history label", () => {
    const review = composeMonthly([
      { date: "2026-07-01", portfolioValue: JULY_START },
      { date: "2026-07-15", portfolioValue: 120_000 },
      { date: "2026-07-31", portfolioValue: JULY_END },
    ]);
    expect(review.brief?.performanceChart?.availableHistoryLabel).toBeNull();
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).not.toMatch(/Available portfolio history/);
  });

  it("C. no synthetic history is added when the chart starts after period start", () => {
    const input = [
      { date: "2026-07-20", portfolioValue: 118_000 },
      { date: "2026-07-31", portfolioValue: JULY_END },
    ];
    const review = composeMonthly(input);
    const points = review.brief?.performanceChart?.points ?? [];
    expect(points.map((point) => point.date.slice(0, 10))).toEqual([
      "2026-07-20",
      "2026-07-31",
    ]);
    expect(points.some((point) => point.date.slice(0, 10) < "2026-07-20")).toBe(
      false,
    );
    expect(
      clipChartPointsToPeriod(input, "2026-07-01", "2026-07-31").map(
        (row) => row.date,
      ),
    ).toEqual(["2026-07-20", "2026-07-31"]);
    expect(
      availablePortfolioHistoryLabel("2026-07-20", "2026-07-01", "2026-07-31"),
    ).toBe("Available portfolio history: 20 Jul – 31 Jul");
    expect(
      availablePortfolioHistoryLabel("2026-07-01", "2026-07-01", "2026-07-31"),
    ).toBeNull();
  });

  it("D. Weekly Goal shows Current portfolio snapshot", () => {
    const review = composeWeekly();
    expect(review.brief?.periodEndValue).toBe(WEEK_END);
    expect(review.brief?.currentPortfolioValue).toBe(LIVE_NOW);
    expect(review.brief?.currentContextLabel).toBe("Current portfolio snapshot");
    expect(review.brief?.showGoalVisual).toBe(true);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Current portfolio snapshot/);
    expect(text).toMatch(/Goal uses the current portfolio snapshot/);
  });

  it("E. Monthly keeps the same current-snapshot label", () => {
    const review = composeMonthly([
      { date: "2026-07-01", portfolioValue: JULY_START },
      { date: "2026-07-31", portfolioValue: JULY_END },
    ]);
    expect(review.brief?.currentContextLabel).toBe("Current portfolio snapshot");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Current portfolio snapshot/);
  });
});

describe("Phase 19.7 report/export price-status consumption", () => {
  it("O. PDF and Excel consume the canonical helper, not a page-specific map", () => {
    const brief = read("lib/services/periodIntelligence/buildPeriodReportBrief.ts");
    const excel = read("lib/client/portfolioExport.ts");
    const dashboard = read("lib/client/dashboardPortfolioSnapshot.ts");
    const holdingsRow = read("components/dashboard/HoldingsTodayRow.tsx");
    const holdingPage = read("app/holding/[ticker]/page.tsx");
    const portfolioPage = read("app/portfolio/page.tsx");
    const portfolioSymbol = read("app/portfolio/[symbol]/page.tsx");

    expect(brief).toContain("resolveHoldingPriceTrustStatus");
    expect(brief).toContain("holdingPriceStatusUserLabel");
    expect(excel).toContain("holdingPriceStatusUserLabel");
    expect(excel).toContain("resolveHoldingDisplayPrice");
    expect(dashboard).toContain("resolveHoldingDisplayPrice");
    expect(dashboard).toContain("holdingPricePeriodCaption");
    expect(holdingsRow).toContain("holdingPriceTrustBadgeLabel");
    expect(holdingsRow).toContain("holdingPricePeriodCaption");
    expect(holdingPage).toContain("holdingPricePeriodCaption");
    expect(portfolioPage).toContain("resolveHoldingPriceTrustStatus");
    expect(portfolioSymbol).toContain("holdingPricePeriodCaption");
  });

  it("PDF methodology lists statuses from holdings rather than hardcoding Delayed", () => {
    const brief = read("lib/services/periodIntelligence/buildPeriodReportBrief.ts");
    expect(brief).toContain("Price status in this report:");
    expect(brief).not.toMatch(
      /methodologyNotes[\s\S]*Hardcoded Delayed[\s\S]*Price status/,
    );
  });
});
