import { describe, expect, it } from "vitest";

import { buildPortfolioTimeline, timelineToGoalHistoryPoints } from "@/lib/services/portfolio/timeline";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

function entry(
  overrides: Partial<PortfolioContributionEntry>,
): PortfolioContributionEntry {
  return {
    id: "1",
    portfolioId: "p1",
    userId: "u1",
    entryType: "contribution",
    amount: 1000,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: 1000,
    fxRateUsed: 1,
    entryDate: "2026-03-01",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

const summary: ContributionSummary = {
  totalContributed: 5000,
  totalWithdrawn: 500,
  netContributed: 4500,
  currentValue: 5200,
  valueAboveContributions: 700,
  valueAboveContributionsPercent: 15.555,
  contributionCount: 2,
  withdrawalCount: 1,
  hasContributionData: true,
  contributionBasisReliable: true,
};

describe("buildPortfolioTimeline", () => {
  it("builds contribution and withdrawal events without fabricating chart data", () => {
    const timeline = buildPortfolioTimeline({
      entries: [
        entry({
          id: "a",
          entryDate: "2026-01-01",
          baseAmount: 4000,
          source: "opening_balance",
        }),
        entry({
          id: "b",
          entryType: "withdrawal",
          entryDate: "2026-02-01",
          baseAmount: 500,
        }),
      ],
      contributionSummary: summary,
      chartPoints: null,
      currentPortfolioValue: 5200,
      portfolioValueAvailable: true,
    });

    expect(timeline.hasValueSeries).toBe(false);
    expect(timeline.chartPoints).toEqual([]);
    expect(timeline.events.some((event) => event.kind === "contribution")).toBe(
      true,
    );
    expect(timeline.events.some((event) => event.kind === "withdrawal")).toBe(
      true,
    );
    expect(timeline.events.some((event) => event.kind === "milestone")).toBe(
      true,
    );
  });

  it("joins cumulative net contributions onto existing value series", () => {
    const timeline = buildPortfolioTimeline({
      entries: [
        entry({
          id: "a",
          entryDate: "2026-01-01",
          baseAmount: 4000,
          source: "opening_balance",
          createdAt: "2026-01-01T10:00:00.000Z",
        }),
        entry({
          id: "b",
          entryDate: "2026-02-01",
          baseAmount: 1000,
          createdAt: "2026-02-01T10:00:00.000Z",
        }),
      ],
      contributionSummary: summary,
      chartPoints: [
        {
          date: "2026-01-15",
          portfolioValue: 4100,
          netContributions: null,
          investmentReturn: null,
        },
        {
          date: "2026-02-15",
          portfolioValue: 5200,
          netContributions: null,
          investmentReturn: null,
        },
      ],
      currentPortfolioValue: 5200,
      portfolioValueAvailable: true,
      periodLabel: "1 month",
    });

    expect(timeline.hasValueSeries).toBe(true);
    expect(timeline.valueSeries[0]?.netContributions).toBe(4000);
    expect(timeline.valueSeries[1]?.netContributions).toBe(5000);
    expect(timeline.summary.portfolioGrowth).toBe(1100);
    expect(timelineToGoalHistoryPoints(timeline)).toEqual([
      { date: "2026-01-15", value: 4100 },
      { date: "2026-02-15", value: 5200 },
    ]);
  });

  it("handles empty contributions and empty series", () => {
    const timeline = buildPortfolioTimeline({
      entries: [],
      contributionSummary: {
        ...summary,
        totalContributed: 0,
        totalWithdrawn: 0,
        netContributed: 0,
        hasContributionData: false,
        contributionCount: 0,
        withdrawalCount: 0,
        valueAboveContributions: null,
        valueAboveContributionsPercent: null,
      },
      chartPoints: [],
      currentPortfolioValue: null,
      portfolioValueAvailable: false,
    });

    expect(timeline.hasEvents).toBe(false);
    expect(timeline.hasValueSeries).toBe(false);
    expect(timeline.summary.portfolioGrowth).toBeNull();
  });

  it("includes verified dividend payments when provided", () => {
    const timeline = buildPortfolioTimeline({
      entries: [],
      contributionSummary: summary,
      chartPoints: null,
      currentPortfolioValue: 1000,
      portfolioValueAvailable: true,
      dividendPayments: [
        {
          id: "d1",
          paymentDate: "2026-03-10",
          holdingSymbol: "VWCE",
          amountBase: 12.5,
        },
      ],
    });

    expect(timeline.events[0]?.kind).toBe("dividend");
    expect(timeline.events[0]?.title).toContain("VWCE");
  });
});
