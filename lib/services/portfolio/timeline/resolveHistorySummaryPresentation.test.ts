import { describe, expect, it } from "vitest";

import type { ContributionSummary } from "@/lib/services/contributions/types";
import { resolveHistorySummaryPresentation, investmentReturnDuplicatesValueChange } from "@/lib/services/portfolio/timeline/resolveHistorySummaryPresentation";
import type { PortfolioTimelineSummary } from "@/lib/services/portfolio/timeline/types";

const contributionSummary: ContributionSummary = {
  totalContributed: 400,
  totalWithdrawn: 0,
  netContributed: 400,
  currentValue: 126_706,
  valueAboveContributions: 126_306,
  valueAboveContributionsPercent: null,
  contributionCount: 1,
  withdrawalCount: 0,
  hasContributionData: true,
  contributionBasisReliable: false,
};

function summary(
  overrides: Partial<PortfolioTimelineSummary> = {},
): PortfolioTimelineSummary {
  return {
    currentPortfolioValue: 126_706,
    portfolioValueAvailable: true,
    netContributions: 400,
    totalContributed: 400,
    totalWithdrawn: 0,
    portfolioGrowth: 7_204,
    portfolioGrowthPercent: 6,
    investmentReturn: 7_204,
    investmentReturnPercent: 6,
    startingPortfolioValue: 119_502,
    endingPortfolioValue: 126_706,
    periodLabel: "1 year",
    contributionSummary,
    ...overrides,
  };
}

describe("resolveHistorySummaryPresentation", () => {
  it("does not label a duplicated series delta as Investment Return", () => {
    const presentation = resolveHistorySummaryPresentation(summary());
    expect(presentation.showsInvestmentReturn).toBe(false);
    expect(presentation.metrics.map((row) => row.label)).toEqual([
      "Portfolio value change",
      "Recorded net contributions",
      "Current portfolio value",
    ]);
    expect(presentation.metrics.map((row) => row.amount)).toEqual([
      7_204, 400, 126_706,
    ]);
    expect(presentation.reason).toMatch(/does not deduct recorded funding/i);
  });

  it("detects when a derived return merely duplicates portfolio value change", () => {
    expect(investmentReturnDuplicatesValueChange(summary())).toBe(true);
    expect(
      investmentReturnDuplicatesValueChange(summary({ investmentReturn: 6_800 })),
    ).toBe(false);
  });

  it("still omits Investment Return when the API return differs but funding is incomplete", () => {
    const presentation = resolveHistorySummaryPresentation(
      summary({
        investmentReturn: 6_800,
        contributionSummary: {
          ...contributionSummary,
          contributionBasisReliable: false,
        },
      }),
    );
    expect(presentation.showsInvestmentReturn).toBe(false);
    expect(presentation.metrics).toHaveLength(3);
  });
});
