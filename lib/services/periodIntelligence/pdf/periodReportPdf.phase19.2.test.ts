/**
 * Phase 19.2 — Q2 spine, period-end reconciliation, allocation <0.1%, methodology dedup.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import {
  alignChartEndToCanonical,
  isoCalendarDay,
  resolveCanonicalPeriodEndValue,
} from "@/lib/services/periodIntelligence/buildPeriodReportBrief";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import {
  PERIOD_Q2_QUIET_COPY,
  PERIOD_Q4_QUIET_COPY,
} from "@/lib/services/periodIntelligence/config";
import { countPdfPages } from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

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

function cashBook(value: number): StoredPortfolioHolding[] {
  return [
    holding({
      id: "recon-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: value,
      currentPrice: 1,
      assetType: "cash",
    }),
  ];
}

function tinyFixedIncomeBook(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "fi-euna",
      symbol: "EUNA",
      name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
      quantity: 2,
      currentPrice: 10,
    }),
    holding({
      id: "eq-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 400,
      currentPrice: 120,
      providerSymbol: "VWCE.XETRA",
    }),
  ];
}

function recordedContribution(amount: number, entryDate: string): PortfolioContributionEntry {
  return {
    id: `c-${amount}`,
    portfolioId: "phase19-2",
    userId: "phase19-2-user",
    entryType: "contribution",
    amount,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: amount,
    fxRateUsed: 1,
    entryDate,
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: "recon-cash",
    destinationHoldingSymbol: "EUR",
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: `${entryDate}T09:00:00.000Z`,
    updatedAt: `${entryDate}T09:00:00.000Z`,
  };
}

function composeReview(
  kind: PeriodIntelligenceKind,
  extras: {
    holdings?: StoredPortfolioHolding[];
    chartEnd?: number;
    chartEndDate?: string;
    contributionEntries?: PortfolioContributionEntry[];
  } = {},
) {
  const holdings = extras.holdings ?? cashBook(123_803);
  const snapshot = holdings.reduce(
    (sum, row) => sum + (getHoldingMarketValue(row) ?? 0),
    0,
  );
  const endDate = extras.chartEndDate ?? "2026-08-20";
  const chartEnd = extras.chartEnd ?? snapshot;
  const weekSeries = [
    {
      date: "2026-08-14",
      portfolioValue: 120_000,
      netContributions: null,
      investmentReturn: null,
    },
    {
      date: endDate,
      portfolioValue: chartEnd,
      netContributions: null,
      investmentReturn: null,
    },
  ];
  const companion = buildCompanionReview(kind, {
    now: new Date("2026-08-20T12:00:00.000Z"),
    holdingCount: holdings.length,
    weekSeries,
    monthSeries: [
      {
        date: "2026-07-20",
        portfolioValue: 118_000,
        netContributions: null,
        investmentReturn: null,
      },
      ...weekSeries,
    ],
  });
  return applyPeriodIntelligenceDepth(
    buildPeriodIntelligenceReview({
      kind,
      companion,
      change: summarizeStoredChangeIntelligence([]),
      snapshotCount: 0,
      intelligenceDepth: "complete",
      holdings,
      endingPortfolioValue: snapshot,
      startingPortfolioValue: 120_000,
      currentPortfolioValue: snapshot,
      now: new Date("2026-08-20T12:00:00.000Z"),
      contributionEntries: extras.contributionEntries,
      chartPoints: kind === "monthly"
        ? [
            {
              date: "2026-07-20",
              portfolioValue: 118_000,
              netContributions: null,
              investmentReturn: null,
            },
            ...weekSeries,
          ]
        : weekSeries,
    }),
    "complete",
  );
}

const FOUR_QUESTION_HEADERS = [
  /01\s+WHAT HAPPENED/,
  /02\s+WHAT MATTERS NOW/,
  /03\s+AM I ON TRACK/,
  /04\s+WHAT'?S AHEAD/,
];

describe("Phase 19.2 premium polish and real-data consistency", () => {
  it("always renders the Four Questions spine without fabricating Q2", () => {
    const review = composeReview("weekly");
    expect(review.matters).toBeNull();
    expect(review.insightKind === "insufficient_history" || review.insightKind === "no_material_change").toBe(
      true,
    );
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    for (const pattern of FOUR_QUESTION_HEADERS) {
      expect(text).toMatch(pattern);
    }
    expect(text).toContain(PERIOD_Q2_QUIET_COPY);
    expect(text).not.toMatch(/invented|placeholder insight|TODO|FIXME|test fixture/i);
    expect(review.matters).toBeNull();
  });

  it("does not invent Q2 copy in the composer when canonical matters is empty", () => {
    const review = composeReview("weekly");
    expect(review.matters).toBeNull();
    expect(review.brief?.thirtySeconds.join(" ")).not.toContain("needs your attention right now");
  });

  it("cover and chart use the labelled Companion period-end, not a later live snapshot", () => {
    expect(
      resolveCanonicalPeriodEndValue({
        holdingsSnapshotValue: 123_803,
        endingPortfolioValue: 123_801,
        companionMetricsEndingValue: 123_801,
        periodEndDate: "2026-08-20",
        snapshotAsOfDay: "2026-08-20",
      }),
    ).toBe(123_801);

    const aligned = alignChartEndToCanonical(
      [
        { date: "2026-08-14", value: 120_000 },
        { date: "2026-08-20", value: 123_801 },
      ],
      123_801,
      "2026-08-20",
    );
    expect(aligned[aligned.length - 1]?.value).toBe(123_801);
    expect(isoCalendarDay("2026-08-20T12:00:00.000Z")).toBe("2026-08-20");

    const review = composeReview("weekly", { chartEnd: 123_801, chartEndDate: "2026-08-20" });
    expect(review.brief?.portfolioValueLabel).toBe("€123,801");
    expect(review.brief?.performanceChart?.endValueLabel).toBe("€123,801");
    expect(review.brief?.performanceChart?.endLabel).toMatch(/20 Aug 2026/);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/€123,801/);
  });

  it("does not force a chart end onto a different calendar day", () => {
    const differentDay = alignChartEndToCanonical(
      [
        { date: "2026-08-14", value: 120_000 },
        { date: "2026-08-19", value: 123_801 },
      ],
      123_803,
      "2026-08-20",
    );
    expect(differentDay[differentDay.length - 1]?.value).toBe(123_801);

    const review = composeReview("weekly", {
      chartEnd: 123_801,
      chartEndDate: "2026-08-19",
    });
    expect(review.brief?.portfolioValueLabel).toBe("€123,801");
    expect(review.brief?.performanceChart?.endValueLabel).toBe("€123,801");
  });

  it("formats non-zero tiny allocation as <0.1%, not 0%", () => {
    const review = composeReview("monthly", { holdings: tinyFixedIncomeBook() });
    const fi = review.brief?.allocation.find((row) => row.groupId === "fixed_income");
    expect(fi).toBeTruthy();
    expect(fi?.rawPercent).toBeGreaterThan(0);
    expect(fi?.rawPercent).toBeLessThan(0.1);
    expect(fi?.percentLabel).toBe("<0.1%");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/<0\.1%/);
    const fiLine = text.split("\n").find((line) => /Fixed income/i.test(line));
    expect(text).not.toMatch(/Fixed income[\s\S]{0,40}\b0%/);
    expect(fiLine ?? text).not.toMatch(/Fixed income\s+0%/);
  });

  it("shows Contribution history may be incomplete only once", () => {
    const review = composeReview("weekly", {
      contributionEntries: [recordedContribution(50, "2026-08-18")],
    });
    expect(review.brief?.funding?.coverageNote).toBe(INCOMPLETE_HISTORY_NOTE);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    const matches = text.match(/Contribution history may be incomplete/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("keeps Q4 quiet copy instead of repeating the Q2 headline", () => {
    const review = composeReview("weekly");
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/04\s+WHAT'?S AHEAD/);
    expect(text).toContain(PERIOD_Q4_QUIET_COPY);
  });

  it("does not leak the Phase 19 fixture into production PDF path files", () => {
    const files = [
      "lib/services/periodIntelligence/buildPeriodReportBrief.ts",
      "lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts",
      "lib/services/periodIntelligence/pdf/pdfCharts.ts",
      "components/companion/CompanionReviewPage.tsx",
      "app/api/review/pdf/route.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/phase19ReviewFixture|ZZZX|Custom Private Note/);
    }
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

  it("weekly and monthly PDFs stay within the compact page budget", () => {
    const weeklySparse = countPdfPages(renderPeriodReportPdf(composeReview("weekly")));
    const monthlySparse = countPdfPages(
      renderPeriodReportPdf(composeReview("monthly", { holdings: tinyFixedIncomeBook() })),
    );
    expect(weeklySparse).toBeGreaterThanOrEqual(2);
    expect(weeklySparse).toBeLessThanOrEqual(5);
    expect(monthlySparse).toBeGreaterThanOrEqual(2);
    expect(monthlySparse).toBeLessThanOrEqual(6);
    expect(monthlySparse).toBeGreaterThanOrEqual(weeklySparse);
  });

  it("Four Questions catalog remains the spine labels", () => {
    expect(FOUR_QUESTIONS.map((row) => row.numberLabel)).toEqual(["01", "02", "03", "04"]);
  });
});
