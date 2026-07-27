import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidEntry(
  entry: PortfolioContributionEntry,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): boolean {
  if (entry.baseCurrency !== portfolioBaseCurrency) {
    return false;
  }

  if (!isValidAmount(entry.baseAmount)) {
    return false;
  }

  return entry.entryType === "contribution" || entry.entryType === "withdrawal";
}

/**
 * Portfolio-level contribution totals and value comparison.
 * Amounts are aggregated in the portfolio base currency using stored base_amount.
 */
export function calculateContributionSummary(
  entries: PortfolioContributionEntry[],
  currentPortfolioValueBase: number | null,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): ContributionSummary {
  let totalContributed = 0;
  let totalWithdrawn = 0;
  let contributionCount = 0;
  let withdrawalCount = 0;

  for (const entry of entries) {
    if (!isValidEntry(entry, portfolioBaseCurrency)) {
      continue;
    }

    if (entry.entryType === "contribution") {
      totalContributed += entry.baseAmount;
      contributionCount += 1;
      continue;
    }

    totalWithdrawn += entry.baseAmount;
    withdrawalCount += 1;
  }

  const netContributed = totalContributed - totalWithdrawn;
  const hasContributionData = contributionCount + withdrawalCount > 0;

  const currentValue =
    currentPortfolioValueBase != null &&
    Number.isFinite(currentPortfolioValueBase)
      ? currentPortfolioValueBase
      : null;

  let valueAboveContributions: number | null = null;
  let valueAboveContributionsPercent: number | null = null;

  if (currentValue != null && hasContributionData) {
    valueAboveContributions = currentValue - netContributed;

    if (netContributed > 0) {
      const percent = (valueAboveContributions / netContributed) * 100;
      valueAboveContributionsPercent = Number.isFinite(percent) ? percent : null;
    }
  }

  return {
    totalContributed,
    totalWithdrawn,
    netContributed,
    currentValue,
    valueAboveContributions,
    valueAboveContributionsPercent,
    contributionCount,
    withdrawalCount,
    hasContributionData,
  };
}
