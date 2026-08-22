/**
 * Honest Portfolio History summary labels.
 * The reconstructed value series does not deduct recorded funding, so a
 * duplicated “Investment return” equal to portfolio growth is misleading.
 */

import type { PortfolioTimelineSummary } from "@/lib/services/portfolio/timeline/types";

export type HistorySummaryMetricId =
  | "value_change"
  | "recorded_net"
  | "current_value";

export type HistorySummaryMetric = {
  id: HistorySummaryMetricId;
  label: string;
  amount: number | null;
};

export type HistorySummaryPresentation = {
  metrics: HistorySummaryMetric[];
  showsInvestmentReturn: false;
  reason: string;
};

const NO_ADJUSTED_RETURN_REASON =
  "Contribution-adjusted return is not labeled Investment Return because the value series does not deduct recorded funding.";

export function resolveHistorySummaryPresentation(
  summary: PortfolioTimelineSummary,
): HistorySummaryPresentation {
  return {
    metrics: [
      {
        id: "value_change",
        label: "Portfolio value change",
        amount: summary.portfolioGrowth,
      },
      {
        id: "recorded_net",
        label: "Recorded net contributions",
        amount: summary.netContributions,
      },
      {
        id: "current_value",
        label: "Current portfolio value",
        amount: summary.portfolioValueAvailable
          ? summary.currentPortfolioValue
          : null,
      },
    ],
    showsInvestmentReturn: false,
    reason: NO_ADJUSTED_RETURN_REASON,
  };
}

export function investmentReturnDuplicatesValueChange(
  summary: PortfolioTimelineSummary,
): boolean {
  if (summary.portfolioGrowth == null || summary.investmentReturn == null) {
    return false;
  }
  return Math.abs(summary.portfolioGrowth - summary.investmentReturn) < 0.51;
}
