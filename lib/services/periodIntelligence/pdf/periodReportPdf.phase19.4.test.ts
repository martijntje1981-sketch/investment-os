/**
 * Phase 19.4 — authenticated /api/review/pdf must use the premium Phase 19.2
 * composer/renderer, not the compact Phase 9B layout still on production HEAD.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import {
  alignChartEndToCanonical,
  resolveCanonicalPeriodEndValue,
} from "@/lib/services/periodIntelligence/buildPeriodReportBrief";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import { PERIOD_Q2_QUIET_COPY } from "@/lib/services/periodIntelligence/config";
import { isPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/pdf/isPeriodIntelligenceReview";
import { countPdfPages, sanitizePdfText } from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { HoldingPeriodMove } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
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

/** Route-parity holdings — not the Phase 19 fixture book. */
function verificationHoldings(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "verify-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 10,
      currentPrice: 100,
      providerSymbol: "VWCE.XETRA",
      priceDataStatus: "stale",
    }),
    holding({
      id: "verify-ppfb",
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      quantity: 4,
      currentPrice: 50,
      providerSymbol: "PPFB.XETRA",
      priceDataStatus: "delayed",
    }),
    holding({
      id: "verify-cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: 200,
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

function verificationMoves(): HoldingPeriodMove[] {
  return [
    {
      holdingId: "verify-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      assetType: "investment",
      quantity: 10,
      startingClose: 90,
      endingClose: 100,
      startingValueEur: 900,
      endingValueEur: 1_000,
      moveEur: 100,
      returnPercent: (100 / 90) * 100 - 100,
      included: true,
      exclusionReason: null,
      usesApproximateFx: false,
    },
    {
      holdingId: "verify-ppfb",
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      assetType: "investment",
      quantity: 4,
      startingClose: 55,
      endingClose: 50,
      startingValueEur: 220,
      endingValueEur: 200,
      moveEur: -20,
      returnPercent: (50 / 55) * 100 - 100,
      included: true,
      exclusionReason: null,
      usesApproximateFx: false,
    },
  ];
}

function composeAuthenticatedReview(kind: PeriodIntelligenceKind) {
  const holdings = verificationHoldings();
  const snapshot = holdings.reduce(
    (sum, row) => sum + (getHoldingMarketValue(row) ?? 0),
    0,
  );
  const weekSeries = [
    {
      date: "2026-08-14",
      portfolioValue: 1_350,
      netContributions: null,
      investmentReturn: null,
    },
    {
      date: "2026-08-20",
      portfolioValue: snapshot,
      netContributions: null,
      investmentReturn: null,
    },
  ];
  const monthSeries = [
    {
      date: "2026-07-20",
      portfolioValue: 1_300,
      netContributions: null,
      investmentReturn: null,
    },
    ...weekSeries,
  ];
  const companion = buildCompanionReview(kind, {
    now: new Date("2026-08-20T12:00:00.000Z"),
    holdingCount: holdings.length,
    weekSeries,
    monthSeries,
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
      startingPortfolioValue: 1_350,
      chartPoints: kind === "monthly" ? monthSeries : weekSeries,
      holdingMoves: verificationMoves(),
      resilienceProfile:
        kind === "monthly" ? buildResilienceProfile({ holdings }) : null,
    }),
    "complete",
  );
}

/** Same call the authenticated POST /api/review/pdf route makes after the shape check. */
function renderViaLivePdfRoute(review: unknown) {
  expect(isPeriodIntelligenceReview(review)).toBe(true);
  if (!isPeriodIntelligenceReview(review)) {
    throw new Error("expected canonical period review");
  }
  expect(review.kind === "weekly" || review.kind === "monthly").toBe(true);
  expect(review.intelligenceDepth).toBe("complete");
  return renderPeriodReportPdf(review);
}

const FOUR_QUESTION_HEADERS = [
  /01\s+WHAT HAPPENED/,
  /02\s+WHAT MATTERS NOW/,
  /03\s+AM I ON TRACK/,
  /04\s+WHAT'?S AHEAD/,
];

const FIXTURE_LEAK = [
  /ZZZX/,
  /Custom Private Note/,
  /IGLN/,
  /104,000|104000/,
  /250,000|250000/,
  /BTC[\s\S]{0,48}\+8%/,
  /\+4\.0pp/,
  /phase19ReviewFixture/,
  /buildPhase19PeriodReview/,
];

function assertNoGlyphSubstitution(text: string) {
  expect(text).not.toMatch(/\s\?\s/);
  expect(text).not.toMatch(/Tobailey\s+\?/);
  expect(text).not.toMatch(/Pulse\s+\d+\s+\?/);
  expect(text).not.toMatch(/\/100\s+\?/);
  const leftover = text
    .replace(/WHAT HAPPENED\?/g, "")
    .replace(/WHAT MATTERS NOW\?/g, "")
    .replace(/AM I ON TRACK\?/g, "")
    .replace(/WHAT'?S AHEAD\?/g, "");
  expect(leftover).not.toMatch(/\?/);
}

describe("Phase 19.4 production PDF renderer parity", () => {
  it("live PDF route calls the canonical premium renderer and does not rebuild intelligence", () => {
    const route = read("app/api/review/pdf/route.ts");
    expect(route).toMatch("isPeriodIntelligenceReview");
    expect(route).toMatch("renderPeriodReportPdf(review)");
    expect(route).not.toMatch("buildPeriodIntelligenceReview");
    expect(route).not.toMatch("buildPeriodReportBrief");
    expect(route).not.toMatch("buildPhase19PeriodReview");
    expect(route).not.toMatch("phase19Holdings");
    expect(route).not.toMatch("compact");
    expect(route).not.toMatch("legacy");

    const renderer = read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts");
    expect(renderer).toMatch("YOUR PORTFOLIO IN 30 SECONDS");
    expect(renderer).toMatch("pdfVisualSystem");
    expect(renderer).toMatch("drawPerformanceChart");
    expect(renderer).toMatch("drawAllocationChart");
    expect(renderer).not.toMatch(/"EUR "/);
    expect(read("lib/services/periodIntelligence/pdf/pdfText.ts")).not.toMatch(
      /replace\([^)]+,\s*"\?"\)/,
    );

    const archive = read("app/api/review/monthly/[yearMonth]/pdf/route.ts");
    expect(archive).toMatch("renderPeriodReportPdf(review)");
    expect(archive).toMatch("buildArchivedMonthlyPeriodIntelligenceReview");
  });

  it("CompanionReviewPage supplies the extras the premium brief needs", () => {
    const page = read("components/companion/CompanionReviewPage.tsx");
    expect(page).toMatch("chartPoints:");
    expect(page).toMatch("holdingMoves:");
    expect(page).toMatch("endingPortfolioValue:");
    expect(page).toMatch("contributionEntries:");
    expect(page).toMatch("PeriodReportPdfAction");
    expect(page).not.toMatch("phase19ReviewFixture");
  });

  it("sanitizes live separator glyphs without inserting ?", () => {
    expect(sanitizePdfText("Tobailey · Information and analysis only")).toBe(
      "Tobailey - Information and analysis only",
    );
    expect(sanitizePdfText("Weekly Pulse 78 · Improving")).toBe(
      "Weekly Pulse 78 - Improving",
    );
    expect(sanitizePdfText("Resilience 65/100 · Balanced")).toBe(
      "Resilience 65/100 - Balanced",
    );
    expect(sanitizePdfText("Your week — 11–17 Aug")).toBe("Your week - 11-17 Aug");
    expect(sanitizePdfText("Value → €1,400")).toBe("Value -> €1,400");
    expect(sanitizePdfText("Tobailey · Information")).not.toMatch(/\?/);
    expect(sanitizePdfText("€")).toBe("€");
  });

  it("authenticated Weekly uses the premium renderer via the live route call", () => {
    const review = composeAuthenticatedReview("weekly");
    expect(review.brief).toBeTruthy();
    expect(review.brief?.coverTitle).toBe("Your Weekly Review");
    expect(review.brief?.showAllocation).toBe(false);

    const bytes = renderViaLivePdfRoute(review);
    const text = extractPdfPlainText(bytes);
    expect(countPdfPages(bytes)).toBeGreaterThanOrEqual(2);
    expect(text).toMatch(/YOUR PORTFOLIO IN 30 SECONDS/);
    for (const pattern of FOUR_QUESTION_HEADERS) {
      expect(text).toMatch(pattern);
    }
    expect(text).toMatch(/Period performance/);
    expect(text).toMatch(/TOP CONTRIBUTORS|DETRACTORS/);
    expect(text).toContain(PERIOD_Q2_QUIET_COPY);
    expect(text).toMatch(/€1,400/);
    expect(text).not.toMatch(/PORTFOLIO ALLOCATION/);
    expect(text).not.toMatch(/HOLDINGS SNAPSHOT/);
    assertNoGlyphSubstitution(text);
    for (const pattern of FIXTURE_LEAK) {
      expect(text).not.toMatch(pattern);
    }

    writeFileSync(
      path.resolve(process.cwd(), "phase19.4-weekly-route-parity.pdf"),
      Buffer.from(bytes),
    );
  });

  it("authenticated Monthly uses the premium renderer and monthly extras", () => {
    const review = composeAuthenticatedReview("monthly");
    expect(review.brief).toBeTruthy();
    expect(review.brief?.coverTitle).toBe("Your Monthly Review");
    expect(review.brief?.showAllocation).toBe(true);
    expect(review.brief?.showHoldings).toBe(true);
    expect(review.brief?.showScenarios).toBe(true);
    expect(review.brief?.showResilience).toBe(true);

    const bytes = renderViaLivePdfRoute(review);
    const text = extractPdfPlainText(bytes);
    expect(countPdfPages(bytes)).toBeGreaterThanOrEqual(3);
    expect(text).toMatch(/YOUR PORTFOLIO IN 30 SECONDS/);
    for (const pattern of FOUR_QUESTION_HEADERS) {
      expect(text).toMatch(pattern);
    }
    expect(text).toMatch(/Period performance/);
    expect(text).toMatch(/PORTFOLIO ALLOCATION/);
    expect(text).toMatch(/HOLDINGS SNAPSHOT/);
    expect(text).toMatch(/MODELED SCENARIO/);
    expect(text).toMatch(/Precious metals|PPFB|WisdomTree/);
    expect(text).toMatch(/€1,400/);
    expect(text).toMatch(/\/100/);
    assertNoGlyphSubstitution(text);
    for (const pattern of FIXTURE_LEAK) {
      expect(text).not.toMatch(pattern);
    }

    writeFileSync(
      path.resolve(process.cwd(), "phase19.4-monthly-route-parity.pdf"),
      Buffer.from(bytes),
    );
  });

  it("preserves same-day end-value reconciliation and tiny allocation formatting", () => {
    expect(
      resolveCanonicalPeriodEndValue({
        holdingsSnapshotValue: 123_803,
        endingPortfolioValue: 123_801,
        companionMetricsEndingValue: 123_801,
      }),
    ).toBe(123_803);
    const aligned = alignChartEndToCanonical(
      [
        { date: "2026-08-14", value: 120_000 },
        { date: "2026-08-20", value: 123_801 },
      ],
      123_803,
      "2026-08-20",
    );
    expect(aligned[aligned.length - 1]?.value).toBe(123_803);

    const holdings = tinyFixedIncomeBook();
    const snapshot = holdings.reduce(
      (sum, row) => sum + (getHoldingMarketValue(row) ?? 0),
      0,
    );
    const companion = buildCompanionReview("monthly", {
      now: new Date("2026-08-20T12:00:00.000Z"),
      holdingCount: holdings.length,
      monthSeries: [
        { date: "2026-07-20", portfolioValue: 47_000, netContributions: null, investmentReturn: null },
        { date: "2026-08-20", portfolioValue: snapshot, netContributions: null, investmentReturn: null },
      ],
    });
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "monthly",
        companion,
        change: summarizeStoredChangeIntelligence([]),
        snapshotCount: 0,
        intelligenceDepth: "complete",
        holdings,
        endingPortfolioValue: snapshot,
        startingPortfolioValue: 47_000,
        chartPoints: [
          { date: "2026-07-20", portfolioValue: 47_000, netContributions: null, investmentReturn: null },
          { date: "2026-08-20", portfolioValue: snapshot, netContributions: null, investmentReturn: null },
        ],
      }),
      "complete",
    );
    const fi = review.brief?.allocation.find((row) => row.groupId === "fixed_income");
    expect(fi?.percentLabel).toBe("<0.1%");
    const text = extractPdfPlainText(renderViaLivePdfRoute(review));
    expect(text).toMatch(/<0\.1%/);
    expect(text.match(/DATA AND METHODOLOGY/g)?.length).toBe(1);
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
