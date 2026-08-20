/**
 * Phase 19.5 — labelled monthly period values must not mix with the live snapshot.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import {
  clipChartPointsToPeriod,
  resolveCanonicalPeriodEndValue,
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

const JULY_START = 120_312;
const JULY_END = 119_557;
const LIVE_NOW = 126_738;
const JULY_CONTRIBUTION = 400;
const NOW = new Date("2026-08-20T12:00:00.000Z");

function julyContribution(): PortfolioContributionEntry {
  return {
    id: "c-july",
    portfolioId: "phase19-5",
    userId: "phase19-5-user",
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

function liveHoldings(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "live-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: LIVE_NOW,
      currentPrice: 1,
      assetType: "cash",
    }),
  ];
}

const GOAL: GoalSettings = {
  name: "Retirement",
  targetValue: 250_000,
  targetYear: 2035,
  monthlyContribution: 400,
  expectedAnnualReturn: 6,
};

function julyMonthSeries() {
  return [
    { date: "2026-07-01", portfolioValue: JULY_START, netContributions: null, investmentReturn: null },
    { date: "2026-07-15", portfolioValue: 120_000, netContributions: null, investmentReturn: null },
    { date: "2026-07-31", portfolioValue: JULY_END, netContributions: null, investmentReturn: null },
    { date: "2026-08-10", portfolioValue: 122_000, netContributions: null, investmentReturn: null },
    { date: "2026-08-20", portfolioValue: LIVE_NOW, netContributions: null, investmentReturn: null },
  ];
}

function composeJulyMonthly() {
  const holdings = liveHoldings();
  const companion = buildCompanionReview("monthly", {
    now: NOW,
    holdingCount: holdings.length,
    monthSeries: julyMonthSeries(),
    contributionEntries: [julyContribution()],
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
      contributionEntries: [julyContribution()],
      chartPoints: julyMonthSeries(),
      startingPortfolioValue: JULY_START,
      endingPortfolioValue: LIVE_NOW,
      currentPortfolioValue: LIVE_NOW,
      now: NOW,
    }),
    "complete",
  );
}

describe("Phase 19.5 monthly period consistency", () => {
  it("does not treat a later live snapshot as a historical period-end", () => {
    expect(
      resolveCanonicalPeriodEndValue({
        holdingsSnapshotValue: LIVE_NOW,
        endingPortfolioValue: LIVE_NOW,
        companionMetricsEndingValue: JULY_END,
        periodWindowEndValue: JULY_END,
        periodEndDate: "2026-07-31",
        snapshotAsOfDay: "2026-08-20",
      }),
    ).toBe(JULY_END);

    expect(
      clipChartPointsToPeriod(julyMonthSeries(), "2026-07-01", "2026-07-31").map(
        (row) => row.date,
      ),
    ).toEqual(["2026-07-01", "2026-07-15", "2026-07-31"]);
  });

  it("historical July cover, Q1, 30-second summary, and chart share the July result", () => {
    const review = composeJulyMonthly();
    const expectedPercent = formatSignedPercent(
      ((JULY_END - JULY_START) / JULY_START) * 100,
    );
    expect(review.period.startDate).toBe("2026-07-01");
    expect(review.period.endDate).toBe("2026-07-31");
    expect(review.brief?.periodEndValue).toBe(JULY_END);
    expect(review.brief?.periodStartValue).toBe(JULY_START);
    expect(review.brief?.portfolioValueLabel).toBe("€119,557");
    expect(review.brief?.periodChangeLabel).toBe(expectedPercent);
    expect(review.brief?.currentPortfolioValue).toBe(LIVE_NOW);
    expect(review.brief?.currentContextLabel).toBe("Current portfolio snapshot");

    const q1 = `${review.happened?.headline ?? ""}\n${(review.happened?.evidence ?? []).join("\n")}`;
    expect(q1).toMatch(/119,557/);
    expect(q1).toMatch(/120,312/);
    expect(q1).toMatch(/-0\.6%|−0\.6%/);
    expect(review.brief?.periodChangeLabel).toMatch(/-0\.6%|−0\.6%/);

    const thirty = review.brief?.thirtySeconds.join(" ") ?? "";
    expect(thirty).toMatch(/-0\.6%|−0\.6%/);
    expect(thirty).toMatch(/119,557/);
    expect(thirty).toMatch(/July 2026/);
    expect(thirty).not.toMatch(/126,738/);
    expect(thirty).not.toMatch(/\+5\.3%/);

    const chart = review.brief?.performanceChart;
    expect(chart).toBeTruthy();
    expect(chart?.endLabel).toMatch(/31 Jul 2026/);
    expect(chart?.endValueLabel).toBe("€119,557");
    expect(chart?.points.every((point) => point.date <= "2026-07-31")).toBe(true);
    expect(chart?.points.some((point) => point.date.startsWith("2026-08"))).toBe(
      false,
    );

    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Period end - 31 Jul 2026/);
    expect(text).toMatch(/€119,557/);
    expect(text).toMatch(/-0\.6%/);
    expect(text).toMatch(/Current portfolio snapshot/);
    expect(text).toMatch(/YOUR PORTFOLIO IN 30 SECONDS/);
    expect(text).not.toMatch(/Period end - 20 Aug 2026/);
    expect(text).not.toMatch(/10 Aug 2026/);
    expect(text).not.toMatch(/ZZZX|IGLN|phase19ReviewFixture/);

    const contributionLines = text.match(/\+€400|€400/g) ?? [];
    expect(contributionLines.length).toBeGreaterThan(0);
    expect(q1).toMatch(/Net contributions/);
    expect(q1).toMatch(/400/);

    writeFileSync(
      path.resolve(process.cwd(), "phase19.5-july-monthly-parity.pdf"),
      Buffer.from(renderPeriodReportPdf(review)),
    );
  });

  it("does not replace historical monthly period-end with the live snapshot", () => {
    const holdings = liveHoldings();
    expect(
      holdings.reduce((sum, row) => sum + (getHoldingMarketValue(row) ?? 0), 0),
    ).toBe(LIVE_NOW);
    const review = composeJulyMonthly();
    expect(review.brief?.periodEndValue).not.toBe(LIVE_NOW);
    expect(review.brief?.portfolioValueLabel).not.toBe("€126,738");
    expect(review.brief?.currentPortfolioValue).toBe(LIVE_NOW);
  });

  it("Weekly same-day snapshot may still reconcile with period-end", () => {
    const holdings = [
      holding({
        id: "w-cash",
        symbol: "EUR",
        name: "Euro cash",
        quantity: 123_803,
        currentPrice: 1,
        assetType: "cash",
      }),
    ];
    const weekSeries = [
      { date: "2026-08-14", portfolioValue: 120_000, netContributions: null, investmentReturn: null },
      { date: "2026-08-20", portfolioValue: 123_801, netContributions: null, investmentReturn: null },
    ];
    const companion = buildCompanionReview("weekly", {
      now: NOW,
      holdingCount: 1,
      weekSeries,
    });
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion,
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        intelligenceDepth: "complete",
        holdings,
        startingPortfolioValue: 120_000,
        endingPortfolioValue: 123_801,
        currentPortfolioValue: 123_803,
        chartPoints: weekSeries,
        now: NOW,
      }),
      "complete",
    );
    expect(review.period.endDate).toBe("2026-08-20");
    expect(review.brief?.periodEndValue).toBe(123_803);
    expect(review.brief?.portfolioValueLabel).toBe("€123,803");
    expect(review.brief?.performanceChart?.endValueLabel).toBe("€123,803");
    expect(review.brief?.currentContextLabel).toBeNull();
  });

  it("archived monthly stays on stored period data", () => {
    const companion = buildCompanionReview("monthly", {
      now: NOW,
      holdingCount: 2,
      monthSeries: [
        { date: "2026-07-01", portfolioValue: JULY_START, netContributions: null, investmentReturn: null },
        { date: "2026-07-31", portfolioValue: JULY_END, netContributions: null, investmentReturn: null },
      ],
    });
    const payload: MonthlyReviewSnapshotPayload = {
      schemaVersion: 1,
      review: companion,
      metrics: companion.metrics!,
    };
    const archived = buildArchivedMonthlyPeriodIntelligenceReview(payload);
    expect(archived.brief?.periodEndValue).toBe(JULY_END);
    expect(archived.brief?.portfolioValueLabel).toBe("€119,557");
    expect(archived.brief?.currentContextLabel).toBeNull();
    expect(archived.brief?.currentPortfolioValue).toBeNull();
    const text = extractPdfPlainText(renderPeriodReportPdf(archived));
    expect(text).toMatch(/€119,557/);
    expect(text).not.toMatch(/€126,738/);
    expect(text).not.toMatch(/Current portfolio snapshot/);
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
  });
});
