/**
 * Phase 19.1 — production PDF path does not inject Phase 19 fixture data.
 * Verification holdings are a small non-fixture set, not the live user book.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  holdingPriceStatusUserLabel,
  resolveHoldingPriceTrustStatus,
} from "@/lib/client/holdingDisplayPrice";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import { countPdfPages } from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
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

/** Non-fixture composer input — not the user's live book and not the Phase 19 fixture. */
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

function recordedContribution(amount: number, entryDate: string): PortfolioContributionEntry {
  return {
    id: `c-${amount}`,
    portfolioId: "verify",
    userId: "verify-user",
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
    destinationHoldingId: "verify-cash",
    destinationHoldingSymbol: "EUR",
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: `${entryDate}T09:00:00.000Z`,
    updatedAt: `${entryDate}T09:00:00.000Z`,
  };
}

function verificationTotal(holdings = verificationHoldings()) {
  return holdings.reduce((sum, row) => sum + (getHoldingMarketValue(row) ?? 0), 0);
}

function composeVerificationReview(
  kind: PeriodIntelligenceKind,
  extras: {
    chartPoints?: Array<{
      date: string;
      portfolioValue: number;
      netContributions: number | null;
      investmentReturn: number | null;
    }> | null;
    contributionEntries?: PortfolioContributionEntry[];
    startingPortfolioValue?: number | null;
  } = {},
) {
  const holdings = verificationHoldings();
  const total = verificationTotal(holdings);
  const weekSeries = [
    {
      date: "2026-08-14",
      portfolioValue: 1_350,
      netContributions: null,
      investmentReturn: null,
    },
    {
      date: "2026-08-20",
      portfolioValue: total,
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
      endingPortfolioValue: total,
      startingPortfolioValue: extras.startingPortfolioValue ?? 1_350,
      currentPortfolioValue: total,
      now: new Date("2026-08-20T12:00:00.000Z"),
      contributionEntries: extras.contributionEntries,
      chartPoints:
        extras.chartPoints === undefined
          ? kind === "monthly"
            ? monthSeries
            : weekSeries
          : extras.chartPoints,
    }),
    "complete",
  );
}

const PRODUCTION_PDF_PATH_FILES = [
  "components/report/PeriodReportPdfAction.tsx",
  "app/api/review/pdf/route.ts",
  "app/api/review/monthly/[yearMonth]/pdf/route.ts",
  "components/companion/CompanionReviewPage.tsx",
  "lib/services/periodIntelligence/buildPeriodIntelligenceReview.ts",
  "lib/services/periodIntelligence/buildPeriodReportBrief.ts",
  "lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts",
  "lib/services/periodIntelligence/pdf/pdfCharts.ts",
  "lib/services/periodIntelligence/pdf/archivedMonthlyReview.ts",
  "lib/services/periodIntelligence/pdf/index.ts",
];

const FIXTURE_LEAK_PATTERNS = [
  /phase19ReviewFixture/,
  /ZZZX/,
  /Custom Private Note/,
  /104_000|EUR 104,000|€104,000/,
  /buildPhase19PeriodReview/,
  /phase19Holdings/,
];

describe("Phase 19.1 real composer path / fixture isolation", () => {
  it("production PDF path does not import the Phase 19 fixture or ZZZX", () => {
    for (const file of PRODUCTION_PDF_PATH_FILES) {
      const source = read(file);
      for (const pattern of FIXTURE_LEAK_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("CompanionReviewPage composes from live holdings, not a fixture object", () => {
    const page = read("components/companion/CompanionReviewPage.tsx");
    expect(page).toMatch("useUserPortfolio");
    expect(page).toMatch("buildDashboardPortfolioSnapshot");
    expect(page).toMatch("buildPeriodIntelligenceReview");
    expect(page).toMatch("holdings: isArchiveMonth ? [] : holdings");
    expect(page).toMatch("PeriodReportPdfAction");
    expect(page).not.toMatch("buildPhase19PeriodReview");
  });

  it("live PDF route renders the posted canonical review and does not rebuild from a fixture", () => {
    const route = read("app/api/review/pdf/route.ts");
    expect(route).toMatch("isPeriodIntelligenceReview");
    expect(route).toMatch("renderPeriodReportPdf(review)");
    expect(route).not.toMatch("buildPhase19PeriodReview");
    expect(route).not.toMatch("phase19Holdings");
  });

  it("fixture-only holdings such as ZZZX cannot leak into a composed review from other holdings", () => {
    const holdings = verificationHoldings();
    const snapshot = buildDashboardPortfolioSnapshot(holdings, null, false);
    const total = verificationTotal(holdings);
    expect(total).toBe(1_400);
    expect(snapshot.portfolioValue).toBe(total);

    const weekly = composeVerificationReview("weekly");
    const monthly = composeVerificationReview("monthly");
    expect(weekly.isDemo).toBe(false);
    expect(weekly.brief?.portfolioValueLabel).toMatch(/1,400|1400/);
    expect(weekly.brief?.portfolioValueLabel).toBe(
      `€${Math.round(snapshot.portfolioValue).toLocaleString("en-GB")}`,
    );
    const groups = new Set(
      (weekly.brief?.allocation ?? []).map((row) => row.groupId),
    );
    expect(groups.has("other_unclassified")).toBe(false);
    expect(weekly.brief?.holdings.some((row) => row.symbol === "VWCE")).toBe(true);
    expect(weekly.brief?.holdings.some((row) => row.symbol === "ZZZX")).toBe(false);

    const weeklyBytes = renderPeriodReportPdf(weekly);
    const weeklyText = extractPdfPlainText(weeklyBytes);
    expect(countPdfPages(weeklyBytes)).toBeGreaterThanOrEqual(2);
    expect(weeklyText).toMatch(/€1,400|EUR 1,400/);
    expect(weeklyText).not.toMatch(/ZZZX/);
    expect(weeklyText).not.toMatch(/Custom Private Note/);
    expect(weeklyText).not.toMatch(/IGLN/);
    expect(weeklyText).not.toMatch(/104,000|104000/);
    expect(weeklyText).not.toMatch(/\+4\.0pp/);
    expect(weeklyText).not.toMatch(/250,000|250000/);
    expect(weeklyText).not.toMatch(/\bLive\b/);
    expect(weeklyText).not.toMatch(/TESTSYNC/);

    const monthlyText = extractPdfPlainText(renderPeriodReportPdf(monthly));
    expect(monthlyText).toMatch(/VWCE|Vanguard/);
    expect(monthlyText).toMatch(/PPFB|WisdomTree/);
    expect(monthlyText).not.toMatch(/ZZZX/);
    expect(monthlyText).not.toMatch(/IGLN/);
    expect(monthlyText).toMatch(
      /not article volume|Period contribution by holding is shown only when period attribution is available/,
    );
    expect(monthlyText).toMatch(/Vanguard FTSE All-World/);
    expect(monthlyText).toMatch(/WisdomTree Physical Gold/);
  });

  it("allocation for the composed holdings uses Phase 17 groups including Precious metals", () => {
    const holdings = verificationHoldings();
    const allocation = buildPortfolioExposureAllocation(holdings);
    const ids = allocation.groups.map((group) => group.groupId);
    expect(ids).toContain("diversified_equity");
    expect(ids).toContain("precious_metals");
    expect(ids).toContain("cash");
    expect(ids).not.toContain("other_unclassified");
    expect(allocation.totalValue).toBe(verificationTotal(holdings));
    const metals = allocation.groups.find((group) => group.groupId === "precious_metals");
    expect(metals?.holdings.some((row) => row.symbol === "PPFB")).toBe(true);

    const monthly = composeVerificationReview("monthly");
    const briefIds = (monthly.brief?.allocation ?? []).map((row) => row.groupId);
    expect(briefIds).toEqual(ids);
    expect(monthly.brief?.allocation?.some((row) => /Precious metals/i.test(row.label))).toBe(
      true,
    );
  });

  it("sparse history does not invent a performance line", () => {
    const review = composeVerificationReview("weekly", {
      chartPoints: [
        {
          date: "2026-08-20",
          portfolioValue: 1_400,
          netContributions: null,
          investmentReturn: null,
        },
      ],
    });
    expect(review.brief?.performanceChart).toBeNull();
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).not.toMatch(/2026-01-01/);
  });

  it("stale priced holdings stay Last session, never Live or Estimated", () => {
    const vwce = verificationHoldings()[0]!;
    expect(resolveHoldingPriceTrustStatus(vwce)).toBe("last_session");
    expect(holdingPriceStatusUserLabel(resolveHoldingPriceTrustStatus(vwce))).toBe(
      "Last session",
    );
    const ppfb = verificationHoldings()[1]!;
    expect(holdingPriceStatusUserLabel(resolveHoldingPriceTrustStatus(ppfb))).toBe(
      "Delayed",
    );

    const monthly = composeVerificationReview("monthly");
    const vwceRow = monthly.brief?.holdings.find((row) => row.symbol === "VWCE");
    expect(vwceRow?.statusLabel).toBe("Last session");
    expect(vwceRow?.statusLabel).not.toBe("Estimated");
    const text = extractPdfPlainText(renderPeriodReportPdf(monthly));
    expect(text).toMatch(/Last session/);
    expect(text).not.toMatch(/\bLive\b/);
  });

  it("weekly stays compact while monthly adds allocation, holdings, and scenarios", () => {
    const weekly = composeVerificationReview("weekly");
    const monthly = composeVerificationReview("monthly");
    expect(weekly.brief?.coverTitle).toBe("Your Weekly Review");
    expect(monthly.brief?.coverTitle).toBe("Your Monthly Review");
    expect(weekly.brief?.showAllocation).toBe(false);
    expect(weekly.brief?.showHoldings).toBe(false);
    expect(weekly.brief?.showScenarios).toBe(false);
    expect(monthly.brief?.showAllocation).toBe(true);
    expect(monthly.brief?.showHoldings).toBe(true);

    const weeklyText = extractPdfPlainText(renderPeriodReportPdf(weekly));
    const monthlyText = extractPdfPlainText(renderPeriodReportPdf(monthly));
    expect(weeklyText).toMatch(/Your Weekly Review/);
    expect(monthlyText).toMatch(/Your Monthly Review/);
    expect(weeklyText).not.toMatch(/PORTFOLIO ALLOCATION/);
    expect(monthlyText).toMatch(/PORTFOLIO ALLOCATION/);
    expect(monthlyText).toMatch(/PPFB|WisdomTree/);
    expect(monthlyText).toMatch(/MODELED SCENARIO|not a forecast/i);
  });

  it("a small recorded contribution is activity, not a complete lifetime funding basis", () => {
    const review = composeVerificationReview("weekly", {
      contributionEntries: [recordedContribution(50, "2026-08-18")],
    });
    expect(review.brief?.funding?.periodActivityLabel).toMatch(
      /Recorded contribution €50|Recorded contribution EUR 50/,
    );
    expect(review.brief?.funding?.coverageNote).toBe(INCOMPLETE_HISTORY_NOTE);
    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Contribution history may be incomplete/);
    expect(text).not.toMatch(/lifetime (return|gain|performance)/i);
    expect(text).not.toMatch(/€400|EUR 400/);
  });
});
