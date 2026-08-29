/**
 * Phase 19.6 — cover, 30-second summary, Q1 and chart share one Companion period result.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import {
  canonicalPeriodResultFromCompanion,
  clipChartPointsToPeriod,
} from "@/lib/services/periodIntelligence/buildPeriodReportBrief";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import { buildArchivedMonthlyPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/pdf/archivedMonthlyReview";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { formatSignedPercent } from "@/lib/services/portfolio/companion/format";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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
const JULY_MOVE = JULY_END - JULY_START;
const JULY_CONTRIBUTION = 400;
const LIVE_NOW = 127_526;
const WEEK_START = 120_820;
const WEEK_MOVE = 4_202;
const WEEK_END = WEEK_START + WEEK_MOVE;

function julyContribution(): PortfolioContributionEntry {
  return {
    id: "c-july-400",
    portfolioId: "phase19-6",
    userId: "phase19-6-user",
    entryType: "contribution",
    amount: JULY_CONTRIBUTION,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: JULY_CONTRIBUTION,
    fxRateUsed: 1,
    entryDate: "2026-07-10",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: "live-cash",
    destinationHoldingSymbol: "EUR",
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-07-10T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
  };
}

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

function percentFromQ1(text: string): string | null {
  const match = text.match(/\(([+\-−]\d+\.\d+%)\)/);
  return match?.[1] ?? null;
}

describe("Phase 19.6 canonical period-performance reconciliation", () => {
  it("MONTHLY: cover, 30 seconds, Q1 and chart share July movement, not the live snapshot", () => {
    const holdings = liveCash(LIVE_NOW);
    const monthSeries = [
      { date: "2026-07-01", portfolioValue: JULY_START, netContributions: null, investmentReturn: null },
      { date: "2026-07-15", portfolioValue: 120_000, netContributions: null, investmentReturn: null },
      { date: "2026-07-31", portfolioValue: JULY_END, netContributions: null, investmentReturn: null },
      { date: "2026-08-10", portfolioValue: 122_000, netContributions: null, investmentReturn: null },
      { date: "2026-08-20", portfolioValue: 123_807, netContributions: null, investmentReturn: null },
    ];
    const companion = buildCompanionReview("monthly", {
      now: NOW,
      holdingCount: holdings.length,
      monthSeries,
      contributionEntries: [julyContribution()],
    });
    const canonical = canonicalPeriodResultFromCompanion(companion);
    expect(canonical.periodStartDate).toBe("2026-07-01");
    expect(canonical.periodEndDate).toBe("2026-07-31");
    expect(canonical.periodStartValue).toBe(JULY_START);
    expect(canonical.periodEndValue).toBe(JULY_END);
    expect(canonical.periodMovementAmount).toBe(JULY_MOVE);
    expect(canonical.periodNetContributions).toBe(JULY_CONTRIBUTION);
    expect(canonical.periodInvestmentReturnAmount).toBe(JULY_MOVE - JULY_CONTRIBUTION);

    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion,
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        intelligenceDepth: "complete",
        holdings,
        contributionEntries: [julyContribution()],
        chartPoints: monthSeries,
        startingPortfolioValue: JULY_START,
        endingPortfolioValue: LIVE_NOW,
        currentPortfolioValue: LIVE_NOW,
        now: NOW,
      }),
      "complete",
    );

    const expectedPercent = formatSignedPercent(canonical.periodMovementPercent!);
    expect(review.brief?.periodEndValue).toBe(JULY_END);
    expect(review.brief?.periodStartValue).toBe(JULY_START);
    expect(review.brief?.periodChangeAmount).toBe(JULY_MOVE);
    expect(review.brief?.periodChangeAmount).toBe(
      (review.brief?.periodEndValue ?? 0) - (review.brief?.periodStartValue ?? 0),
    );
    expect(review.brief?.periodChangeLabel).toBe(expectedPercent);
    expect(review.brief?.portfolioValueLabel).toBe("€119,562");
    expect(review.brief?.currentPortfolioValue).toBe(LIVE_NOW);
    expect(review.brief?.currentContextLabel).toBe("Current portfolio snapshot");

    const q1 = `${review.happened?.headline ?? ""}\n${(review.happened?.evidence ?? []).join("\n")}`;
    expect(percentFromQ1(q1)).toBe(expectedPercent);
    expect(q1).toMatch(/120,317/);
    expect(q1).toMatch(/119,562/);
    expect(q1).toMatch(/400/);
    expect(review.brief?.periodInvestmentReturnAmount).toBe(-1_155);

    const thirty = review.brief?.thirtySeconds.join(" ") ?? "";
    expect(thirty).toContain(expectedPercent);
    expect(thirty).toMatch(/119,562/);
    expect(thirty).not.toMatch(/127,526/);
    expect(thirty).not.toMatch(/\+6\.0%/);

    const chart = review.brief?.performanceChart;
    expect(chart).toBeTruthy();
    expect(chart?.points.every((point) => point.date >= "2026-07-01")).toBe(true);
    expect(chart?.points.every((point) => point.date <= "2026-07-31")).toBe(true);
    expect(clipChartPointsToPeriod(monthSeries, "2026-07-01", "2026-07-31").some((row) => row.date.startsWith("2026-08"))).toBe(false);
    expect(chart?.endValueLabel).toBe("€119,562");
    expect(chart?.endLabel).toMatch(/31 Jul 2026/);

    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/-0\.6%/);
    expect(text).toMatch(/€119,562/);
    expect(text).toMatch(/Current portfolio snapshot/);
    expect(text).toMatch(/Contribution history may be incomplete/);
    expect(text).not.toMatch(/Period end - 20 Aug 2026/);
    expect(text).not.toMatch(/ZZZX|phase19ReviewFixture/);
  });

  it("WEEKLY: cover %, 30-second % and Q1 % are the Companion movement %, not the live snapshot %", () => {
    const holdings = liveCash(LIVE_NOW);
    const weekSeries = [
      { date: "2026-08-14", portfolioValue: WEEK_START, netContributions: null, investmentReturn: null },
      { date: "2026-08-17", portfolioValue: 123_000, netContributions: null, investmentReturn: null },
      { date: "2026-08-20", portfolioValue: WEEK_END, netContributions: null, investmentReturn: null },
    ];
    const companion = buildCompanionReview("weekly", {
      now: NOW,
      holdingCount: holdings.length,
      weekSeries,
    });
    const canonical = canonicalPeriodResultFromCompanion(companion);
    expect(canonical.periodStartValue).toBe(WEEK_START);
    expect(canonical.periodEndValue).toBe(WEEK_END);
    expect(canonical.periodMovementAmount).toBe(WEEK_MOVE);

    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion,
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        intelligenceDepth: "complete",
        holdings,
        chartPoints: [
          ...weekSeries,
          { date: "2026-08-21", portfolioValue: LIVE_NOW, netContributions: null, investmentReturn: null },
        ],
        startingPortfolioValue: WEEK_START,
        endingPortfolioValue: LIVE_NOW,
        currentPortfolioValue: LIVE_NOW,
        now: NOW,
      }),
      "complete",
    );

    const expectedPercent = formatSignedPercent(canonical.periodMovementPercent!);
    expect(expectedPercent).toBe(formatSignedPercent((WEEK_MOVE / WEEK_START) * 100));
    expect(review.brief?.periodChangeLabel).toBe(expectedPercent);
    expect(review.brief?.portfolioValueLabel).toBe("€125,022");
    expect(review.brief?.currentPortfolioValue).toBe(LIVE_NOW);

    const q1 = review.happened?.headline ?? "";
    expect(percentFromQ1(q1)).toBe(expectedPercent);
    expect(percentFromQ1(q1)).not.toBe("+6.6%");

    const thirty = review.brief?.thirtySeconds.join(" ") ?? "";
    expect(thirty).toContain(expectedPercent);
    expect(thirty).toMatch(/125,022/);
    expect(thirty).not.toMatch(/127,526/);

    const chart = review.brief?.performanceChart;
    expect(chart?.points.every((point) => point.date <= "2026-08-20")).toBe(true);
    expect(chart?.points.some((point) => point.date === "2026-08-21")).toBe(false);
    expect(chart?.startValueLabel).toBe("€120,820");
    expect(chart?.endValueLabel).toBe("€125,022");
  });

  it("archived monthly stays on stored July values", () => {
    const companion = buildCompanionReview("monthly", {
      now: NOW,
      holdingCount: 2,
      monthSeries: [
        { date: "2026-07-01", portfolioValue: JULY_START, netContributions: null, investmentReturn: null },
        { date: "2026-07-31", portfolioValue: JULY_END, netContributions: null, investmentReturn: null },
      ],
    });
    const archived = buildArchivedMonthlyPeriodIntelligenceReview({
      schemaVersion: 1,
      review: companion,
      metrics: companion.metrics!,
    } satisfies MonthlyReviewSnapshotPayload);
    expect(archived.brief?.periodEndValue).toBe(JULY_END);
    expect(archived.brief?.periodChangeAmount).toBe(JULY_MOVE);
    expect(archived.brief?.currentPortfolioValue).toBeNull();
  });

  it("does not change Excel export, email delivery, or access gating", () => {
    expect(read("lib/client/portfolioExport.ts")).toMatch("buildPortfolioWorkbook");
    expect(read("lib/services/periodIntelligence/pdf/pdfAccess.ts")).toMatch(
      "period_briefings",
    );
    expect(read("lib/services/periodIntelligence/email/deliver.ts")).toMatch(
      /Period report|deliver/i,
    );
    expect(read("components/report/PeriodReportPdfAction.tsx")).toMatch(
      "/api/review/pdf",
    );
    expect(read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts")).toMatch(
      "YOUR PORTFOLIO IN 30 SECONDS",
    );
    expect(read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts")).not.toMatch(
      "phase19ReviewFixture",
    );
  });
});
