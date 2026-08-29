/**
 * Quality gate: PDF Goal/funding availability must match
 * resolvePortfolioTotalValueAvailability — the same helper Dashboard/Goals use.
 */

import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { resolvePortfolioTotalValueAvailability } from "@/lib/client/portfolioValuationAvailability";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import {
  holdingsSnapshotValue,
  resolvePeriodReportCurrentPortfolioContext,
} from "@/lib/services/periodIntelligence/buildPeriodReportBrief";
import {
  extractPdfPlainText,
  renderPeriodReportPdf,
} from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const GOAL: GoalSettings = {
  targetValue: 100_000,
  targetYear: 2036,
  monthlyContribution: 500,
  expectedAnnualReturn: 8,
};

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

function unpricedInvestmentPlusCash(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "vwce-unpriced",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 10,
      currentPrice: 0,
      providerSymbol: "VWCE.XETRA",
      priceDataStatus: "unavailable",
    }),
    holding({
      id: "cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: 5_000,
      currentPrice: 1,
      assetType: "cash",
    }),
  ];
}

function pricedInvestmentPlusCash(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "vwce-priced",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 10,
      currentPrice: 100,
      providerSymbol: "VWCE.XETRA",
      priceDataStatus: "stale",
    }),
    holding({
      id: "cash",
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
    portfolioId: "avail",
    userId: "avail-user",
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
    destinationHoldingId: "cash",
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
  holdings: StoredPortfolioHolding[],
  extras: {
    currentPortfolioValue?: number | null;
    contributionEntries?: PortfolioContributionEntry[];
    hasSavedGoal?: boolean;
    goal?: GoalSettings | null;
    goalStatus?: "Ahead of schedule" | "On track" | "Slightly behind" | "Behind schedule" | "Unknown" | null;
  } = {},
) {
  const companion = buildCompanionReview(kind, {
    now: new Date("2026-08-20T12:00:00.000Z"),
    holdingCount: holdings.length,
    hasSavedGoal: extras.hasSavedGoal ?? true,
    goalStatus:
      extras.goalStatus === undefined
        ? extras.hasSavedGoal === false
          ? null
          : "Unknown"
        : extras.goalStatus,
    weekSeries:
      kind === "weekly"
        ? [
            { date: "2026-08-17", portfolioValue: 96_000, netContributions: null, investmentReturn: null },
            { date: "2026-08-20", portfolioValue: 100_000, netContributions: null, investmentReturn: null },
          ]
        : undefined,
    monthSeries:
      kind === "monthly"
        ? [
            { date: "2026-08-01", portfolioValue: 96_000, netContributions: null, investmentReturn: null },
            { date: "2026-08-20", portfolioValue: 100_000, netContributions: null, investmentReturn: null },
          ]
        : undefined,
  });

  return applyPeriodIntelligenceDepth(
    buildPeriodIntelligenceReview({
      kind,
      companion,
      change: summarizeStoredChangeIntelligence([]),
      snapshotCount: 0,
      intelligenceDepth: "complete",
      holdings,
      goal: extras.goal ?? GOAL,
      hasSavedGoal: extras.hasSavedGoal ?? true,
      currentPortfolioValue: extras.currentPortfolioValue,
      contributionEntries: extras.contributionEntries,
      startingPortfolioValue: 96_000,
      endingPortfolioValue: 100_000,
      now: new Date("2026-08-20T12:00:00.000Z"),
    }),
    "complete",
  );
}

describe("period report Goal/funding availability", () => {
  it("A. canonical unavailable is unavailable in the app and the PDF", () => {
    const holdings = unpricedInvestmentPlusCash();
    const availability = resolvePortfolioTotalValueAvailability(holdings);
    const performance = buildPortfolioPerformance(holdings);
    const appGoal = buildGoalProgressEngine({
      currentPortfolioValue: performance.totalValueAvailable
        ? performance.totalValue
        : 0,
      portfolioValueAvailable: performance.totalValueAvailable,
      goal: GOAL,
      hasSavedGoal: true,
    });

    expect(availability.isAvailable).toBe(false);
    expect(performance.totalValueAvailable).toBe(false);
    expect(appGoal.portfolioValueAvailable).toBe(false);
    expect(appGoal.estimatedCompletionLabel).toBe("Unavailable");

    const weekly = composeReview("weekly", holdings, {
      currentPortfolioValue: null,
    });
    expect(weekly.brief?.showGoalVisual).toBe(false);
    expect(weekly.brief?.goal.hasGoal).toBe(false);
    expect(weekly.brief?.currentPortfolioValue).toBeNull();
    if (!weekly.brief?.goal.hasGoal) {
      expect(weekly.brief?.goal.prompt).toMatch(/unavailable/i);
    }
  });

  it("B. partial cash remainder does not flip the PDF to available", () => {
    const holdings = unpricedInvestmentPlusCash();
    const cashOnlySum = holdingsSnapshotValue(holdings);
    expect(cashOnlySum).toBe(5_000);

    const context = resolvePeriodReportCurrentPortfolioContext(
      holdings,
      cashOnlySum,
    );
    expect(context.available).toBe(false);
    expect(context.value).toBeNull();

    const review = composeReview("monthly", holdings, {
      currentPortfolioValue: cashOnlySum,
    });
    expect(review.brief?.showGoalVisual).toBe(false);
    expect(review.brief?.goal.hasGoal).toBe(false);
    expect(review.brief?.currentPortfolioValue).toBeNull();
  });

  it("C. unavailable current snapshot is null, never €0", () => {
    const holdings = unpricedInvestmentPlusCash();
    const review = composeReview("weekly", holdings, {
      currentPortfolioValue: 5_000,
    });
    expect(review.brief?.currentPortfolioValue).toBeNull();
    expect(review.brief?.currentPortfolioValue).not.toBe(0);
    expect(review.brief?.showGoalVisual).toBe(false);

    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).not.toMatch(/GOAL PROGRESS/);
    expect(text).not.toMatch(/% of target/);
    expect(text).toMatch(/unavailable/i);
    expect(text).not.toMatch(/Projected completion:/);
  });

  it("D. recorded contribution stays visible when independently valid", () => {
    const holdings = unpricedInvestmentPlusCash();
    const review = composeReview("weekly", holdings, {
      currentPortfolioValue: 5_000,
      contributionEntries: [recordedContribution(400, "2026-08-18")],
    });
    expect(review.brief?.funding?.periodActivityLabel).toMatch(
      /Recorded contribution €400|Recorded contribution EUR 400/,
    );
    expect(review.brief?.funding?.coverageNote).toBe(INCOMPLETE_HISTORY_NOTE);

    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/Recorded contribution €400|Recorded contribution EUR 400/);
    expect(text).not.toMatch(/value above contributions/i);
  });

  it("E. available canonical total preserves Goal output", () => {
    const holdings = pricedInvestmentPlusCash();
    const availability = resolvePortfolioTotalValueAvailability(holdings);
    expect(availability.isAvailable).toBe(true);
    expect(availability.totalValue).toBe(1_200);

    const review = composeReview("monthly", holdings, {
      currentPortfolioValue: availability.totalValue,
      goalStatus: "On track",
    });
    expect(review.brief?.showGoalVisual).toBe(true);
    expect(review.brief?.goal.hasGoal).toBe(true);
    expect(review.brief?.currentPortfolioValue).toBe(1_200);
    if (review.brief?.goal.hasGoal) {
      expect(review.brief.goal.progressPercent).toBe(1.2);
      expect(review.brief.goal.currentLabel).toMatch(/1,200|1200/);
      expect(review.brief.goal.statusLabel).not.toBe("Unknown");
    }

    const text = extractPdfPlainText(renderPeriodReportPdf(review));
    expect(text).toMatch(/GOAL PROGRESS/);
  });

  it("F. Weekly and Monthly use the same availability gate", () => {
    const holdings = unpricedInvestmentPlusCash();
    const weekly = composeReview("weekly", holdings, { currentPortfolioValue: 5_000 });
    const monthly = composeReview("monthly", holdings, { currentPortfolioValue: 5_000 });

    expect(weekly.brief?.showGoalVisual).toBe(false);
    expect(monthly.brief?.showGoalVisual).toBe(false);
    expect(weekly.brief?.currentPortfolioValue).toBeNull();
    expect(monthly.brief?.currentPortfolioValue).toBeNull();
    expect(weekly.brief?.goal.hasGoal).toBe(monthly.brief?.goal.hasGoal);
  });

  it("G. report renderer is unchanged", () => {
    const renderer = read(
      "lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts",
    );
    expect(renderer).toContain("brief?.goal.hasGoal && brief.showGoalVisual");
    expect(renderer).toContain("!brief.goal.hasGoal && brief.goal.prompt");
    expect(renderer).not.toMatch(/resolvePortfolioTotalValueAvailability/);
  });

  it("H. no new API, provider, DB, cron, or polling path", () => {
    const brief = read(
      "lib/services/periodIntelligence/buildPeriodReportBrief.ts",
    );
    expect(brief).toContain("resolvePortfolioTotalValueAvailability");
    expect(brief).not.toMatch(
      /eodhd|openai|setInterval|new cron|puppeteer|playwright|fetch\(|createAdminClient/i,
    );
  });
});
