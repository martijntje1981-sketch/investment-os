import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildCompanionBundle,
  buildCompanionReview,
  detectCompanionMilestone,
  estimatePeriodInvestmentReturn,
  resolveCompanionDashboardTeaser,
  resolveCompanionPeriodWindow,
  resolveCompanionReadiness,
  sumFlowsInRange,
} from "@/lib/services/portfolio/companion";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function series(values: Array<[string, number]>): PortfolioPerformancePoint[] {
  return values.map(([date, portfolioValue]) => ({
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  }));
}

function contribution(
  overrides: Partial<PortfolioContributionEntry> &
    Pick<PortfolioContributionEntry, "entryDate" | "baseAmount" | "entryType">,
): PortfolioContributionEntry {
  return {
    id: overrides.id ?? "c1",
    portfolioId: "p1",
    userId: "u1",
    amount: overrides.baseAmount,
    currency: "EUR",
    baseCurrency: "EUR",
    fxRateUsed: 1,
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: `${overrides.entryDate}T10:00:00.000Z`,
    updatedAt: `${overrides.entryDate}T10:00:00.000Z`,
    ...overrides,
  };
}

describe("companion period windows", () => {
  it("labels weekly as rolling 7 days with an exact range", () => {
    const window = resolveCompanionPeriodWindow(
      "weekly",
      new Date("2026-08-06T12:00:00.000Z"),
    );
    expect(window.periodKind).toBe("rolling_7d");
    expect(window.dateRangeLabel).toMatch(/Last 7 days/);
    expect(window.startDate).toBe("2026-07-31");
    expect(window.endDate).toBe("2026-08-06");
  });

  it("labels completed calendar month when past the first day", () => {
    const window = resolveCompanionPeriodWindow(
      "monthly",
      new Date("2026-08-06T12:00:00.000Z"),
    );
    expect(window.periodKind).toBe("calendar_month");
    expect(window.periodLabel).toBe("This month");
    expect(window.startDate).toBe("2026-07-01");
    expect(window.endDate).toBe("2026-07-31");
  });

  it("labels month-to-date on the first day of the month", () => {
    const window = resolveCompanionPeriodWindow(
      "monthly",
      new Date("2026-08-01T12:00:00.000Z"),
    );
    expect(window.periodKind).toBe("month_to_date");
    expect(window.periodLabel).toBe("Month to date");
  });
});

describe("companion readiness", () => {
  it("blocks empty portfolios", () => {
    expect(
      resolveCompanionReadiness({ period: "daily", holdingCount: 0 }),
    ).toMatchObject({ ready: false });
  });

  it("requires daily comparison data", () => {
    expect(
      resolveCompanionReadiness({
        period: "daily",
        holdingCount: 2,
        hasDailyData: false,
      }).ready,
    ).toBe(false);
  });

  it("requires at least two series points for weekly/monthly", () => {
    expect(
      resolveCompanionReadiness({
        period: "weekly",
        holdingCount: 2,
        seriesPoints: series([["2026-08-01", 100]]),
      }).ready,
    ).toBe(false);
    expect(
      resolveCompanionReadiness({
        period: "weekly",
        holdingCount: 2,
        seriesPoints: series([
          ["2026-08-01", 100],
          ["2026-08-06", 110],
        ]),
      }).ready,
    ).toBe(true);
  });
});

describe("daily story", () => {
  it("summarises a positive move with strongest contributor", () => {
    const review = buildCompanionReview("daily", {
      holdingCount: 3,
      hasDailyData: true,
      todayChange: 643,
      todayPercent: 0.8,
      strongestContributorName: "Bitcoin",
      hasSavedGoal: true,
      goalStatus: "On track",
    });
    expect(review.ready).toBe(true);
    expect(review.lead).toMatch(/\+€643/);
    expect(review.lead).toMatch(/\+0\.8%/);
    expect(review.supportingFacts.some((f) => f.value === "Bitcoin")).toBe(
      true,
    );
    expect(review.goalStatusLabel).toBe("On track");
  });

  it("uses calm wording when unchanged", () => {
    const review = buildCompanionReview("daily", {
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.1,
      hasSavedGoal: true,
      goalStatus: "On track",
    });
    expect(review.lead).toMatch(/broadly unchanged/i);
  });

  it("mentions previous-close freshness", () => {
    const review = buildCompanionReview("daily", {
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 0.5,
      usesPreviousClose: true,
      previousClosePhrase: "Friday's market close",
    });
    expect(review.freshnessNote).toMatch(/Friday's market close/);
  });

  it("does not fabricate a daily story without comparison data", () => {
    const review = buildCompanionReview("daily", {
      holdingCount: 2,
      hasDailyData: false,
    });
    expect(review.ready).toBe(false);
    expect(review.lead).not.toMatch(/\+/);
  });

  it("keeps at most one focus", () => {
    const review = buildCompanionReview("daily", {
      holdingCount: 2,
      hasDailyData: true,
      todayPercent: 2.2,
      concentrationWeightPercent: 45,
      marketContextLabel: "ECB rate decision",
    });
    expect(review.focus).not.toBeNull();
    expect(review.focus?.label).toBeTruthy();
  });
});

describe("weekly review", () => {
  const weekPoints = series([
    ["2026-07-31", 100_000],
    ["2026-08-02", 101_000],
    ["2026-08-06", 101_842],
  ]);

  it("separates investment return from net contributions", () => {
    const review = buildCompanionReview("weekly", {
      now: new Date("2026-08-06T12:00:00.000Z"),
      holdingCount: 4,
      weekSeries: weekPoints,
      contributionEntries: [
        contribution({
          id: "a",
          entryDate: "2026-08-03",
          baseAmount: 300,
          entryType: "contribution",
        }),
      ],
      weekBestHoldingName: "Bitcoin",
      weekWorstHoldingName: "Copper",
      hasSavedGoal: true,
      goalStatus: "On track",
    });

    expect(review.ready).toBe(true);
    expect(review.dateRangeLabel).toMatch(/Last 7 days/);
    const labels = review.supportingFacts.map((f) => f.label);
    expect(labels).toContain("Portfolio movement");
    expect(labels).toContain("Investment return");
    expect(labels).toContain("Net contributions");
    expect(labels).toContain("Strongest contributor");
    expect(labels).toContain("Weakest contributor");

    const invested = review.supportingFacts.find(
      (f) => f.id === "investment-return",
    );
    expect(invested?.value).toMatch(/\+€1[,.]?542/);
  });

  it("handles contribution-driven growth without claiming market return alone", () => {
    const review = buildCompanionReview("weekly", {
      now: new Date("2026-08-06T12:00:00.000Z"),
      holdingCount: 2,
      weekSeries: series([
        ["2026-07-31", 10_000],
        ["2026-08-06", 10_500],
      ]),
      contributionEntries: [
        contribution({
          entryDate: "2026-08-02",
          baseAmount: 500,
          entryType: "contribution",
        }),
      ],
    });
    expect(review.closingStatement ?? review.focus?.label ?? "").toMatch(
      /contributions/i,
    );
  });

  it("does not claim this week without history", () => {
    const review = buildCompanionReview("weekly", {
      holdingCount: 2,
      weekSeries: [],
    });
    expect(review.ready).toBe(false);
    const teaser = resolveCompanionDashboardTeaser({
      daily: buildCompanionReview("daily", {
        holdingCount: 2,
        hasDailyData: true,
        todayPercent: 0,
      }),
      weekly: review,
      monthly: buildCompanionReview("monthly", { holdingCount: 2 }),
      defaultPeriod: "daily",
    });
    expect(teaser.period).toBe("daily");
    expect(teaser.label).toMatch(/review/i);
  });
});

describe("monthly review and milestones", () => {
  it("detects a portfolio value threshold crossing", () => {
    const milestone = detectCompanionMilestone({
      startingValue: 98_000,
      endingValue: 101_200,
      formatMoney: (v) => `€${v.toLocaleString("en-IE")}`,
    });
    expect(milestone?.label).toMatch(/passed €100/);
  });

  it("does not repeat a goal milestone already crossed before the period", () => {
    const milestone = detectCompanionMilestone({
      startingValue: 50_000,
      endingValue: 52_000,
      goalProgressPercent: 52,
      goalProgressAtStart: 51,
      formatMoney: (v) => `€${v}`,
    });
    expect(milestone).toBeNull();
  });

  it("builds a completed-month style review with dividends", () => {
    const review = buildCompanionReview("monthly", {
      now: new Date("2026-08-06T12:00:00.000Z"),
      holdingCount: 3,
      monthSeries: series([
        ["2026-07-01", 95_000],
        ["2026-07-15", 98_000],
        ["2026-07-31", 99_820],
      ]),
      contributionEntries: [
        contribution({
          entryDate: "2026-07-10",
          baseAmount: 500,
          entryType: "contribution",
        }),
      ],
      dividendPayments: [
        { paymentDate: "2026-07-20", amountBase: 42 },
      ],
      monthBestHoldingName: "Bitcoin",
      hasSavedGoal: true,
      goalStatus: "On track",
      goalProgressPercent: 51,
      goalProgressAtPeriodStart: 48,
    });
    expect(review.ready).toBe(true);
    expect(review.periodKind).toBe("calendar_month");
    expect(
      review.supportingFacts.some((f) => f.label === "Dividends received"),
    ).toBe(true);
    expect(review.milestone?.label).toMatch(/50%/);
  });
});

describe("flows math", () => {
  it("estimates investment return as movement minus contributions", () => {
    const result = estimatePeriodInvestmentReturn({
      startingValue: 100_000,
      endingValue: 101_842,
      netContributions: 300,
      hasFlowData: true,
    });
    expect(result.portfolioMovement).toBe(1842);
    expect(result.investmentReturn).toBe(1542);
  });

  it("sums flows inside the range only", () => {
    const totals = sumFlowsInRange(
      [
        contribution({
          entryDate: "2026-07-01",
          baseAmount: 100,
          entryType: "contribution",
        }),
        contribution({
          id: "w",
          entryDate: "2026-08-02",
          baseAmount: 50,
          entryType: "withdrawal",
        }),
      ],
      "2026-08-01",
      "2026-08-06",
    );
    expect(totals.netContributions).toBe(-50);
  });
});

describe("integration surfaces", () => {
  it("exposes /review with period tabs and dashboard teaser", () => {
    const page = read("components/companion/CompanionReviewPage.tsx");
    const dashboard = read("app/dashboard/page.tsx");
    const teaser = read("components/companion/DashboardReviewTeaser.tsx");
    const routes = read("lib/navigation/appRoutes.ts");
    const access = read("lib/auth/routeAccess.ts");

    expect(routes).toContain('REVIEW_PATH = "/review"');
    expect(access).toContain('"/review"');
    expect(page).toContain("CompanionPeriodTabs");
    expect(page).toContain("buildCompanionBundle");
    expect(dashboard).toContain("DashboardReviewTeaser");
    expect(teaser).toContain("resolveCompanionDashboardTeaser");
    expect(teaser).toContain("dashboard-review-teaser");
    const builder = read(
      "lib/services/portfolio/companion/buildCompanionReview.ts",
    );
    expect(builder).toContain("View your weekly review");
  });

  it("does not add AI or paid API calls", () => {
    const builder = read(
      "lib/services/portfolio/companion/buildCompanionReview.ts",
    );
    expect(builder).not.toMatch(/openai|anthropic|fetch\(|axios/i);
  });

  it("keeps empty trial free of fake reviews", () => {
    const bundle = buildCompanionBundle({ holdingCount: 0 });
    expect(bundle.daily.ready).toBe(false);
    expect(bundle.weekly.ready).toBe(false);
    expect(bundle.monthly.ready).toBe(false);
    expect(read("components/companion/CompanionReviewPanel.tsx")).toContain(
      "CompanionEmptyTrialState",
    );
  });

  it("adds Portfolio Review sheet to export when ready", () => {
    const exportSource = read("lib/client/portfolioExport.ts");
    expect(exportSource).toContain("Portfolio Review");
    expect(exportSource).toContain("appendReviewSheet");
  });
});
