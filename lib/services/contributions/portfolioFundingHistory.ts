/**
 * Canonical recorded-funding view for Dashboard, History, and Excel export.
 * Reuses calculateContributionSummary — no parallel ledger.
 */

import {
  calculateContributionSummary,
  summarizeRecordedContributionDates,
} from "@/lib/services/contributions/calculateContributionSummary";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

export const RECORDED_CONTRIBUTIONS_LABEL = "Recorded contributions";
export const RECORDED_WITHDRAWALS_LABEL = "Recorded withdrawals";
export const NET_RECORDED_FUNDING_LABEL = "Net recorded funding";
export const INCOMPLETE_HISTORY_NOTE =
  "Contribution history may be incomplete.";

export type FundingHistoryCoverage = "none" | "partial" | "complete";

export type PortfolioFundingHistory = {
  contributions: number;
  withdrawals: number;
  netRecordedContributions: number;
  activityCount: number;
  contributionCount: number;
  withdrawalCount: number;
  earliestActivity: string | null;
  latestActivity: string | null;
  historyCoverage: FundingHistoryCoverage;
  historyComplete: boolean;
  entries: PortfolioContributionEntry[];
  summary: ContributionSummary;
};

export function buildPortfolioFundingHistory(input: {
  entries: PortfolioContributionEntry[];
  currentPortfolioValueBase: number | null;
  portfolioBaseCurrency: PortfolioBaseCurrency;
}): PortfolioFundingHistory {
  const summary = calculateContributionSummary(
    input.entries,
    input.currentPortfolioValueBase,
    input.portfolioBaseCurrency,
  );
  const dates = summarizeRecordedContributionDates(
    input.entries,
    input.portfolioBaseCurrency,
  );

  const historyComplete = summary.contributionBasisReliable;
  const historyCoverage: FundingHistoryCoverage = !summary.hasContributionData
    ? "none"
    : historyComplete
      ? "complete"
      : "partial";

  return {
    contributions: summary.totalContributed,
    withdrawals: summary.totalWithdrawn,
    netRecordedContributions: summary.netContributed,
    activityCount: dates.count,
    contributionCount: summary.contributionCount,
    withdrawalCount: summary.withdrawalCount,
    earliestActivity: dates.earliestDate,
    latestActivity: dates.latestDate,
    historyCoverage,
    historyComplete,
    entries: input.entries,
    summary,
  };
}

export function fundingCoverageLabel(
  coverage: FundingHistoryCoverage,
): string {
  if (coverage === "complete") return "Recorded history looks complete enough for value comparison";
  if (coverage === "partial") return INCOMPLETE_HISTORY_NOTE;
  return "No recorded contribution activity";
}
