import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

/**
 * Net contributed must cover at least this share of current value
 * before value-above-contributions is treated as a reliable comparison.
 * Opening-balance entries bypass this ratio check.
 */
export const CONTRIBUTION_BASIS_MIN_COVERAGE_RATIO = 0.2;

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

export function hasOpeningBalanceContribution(
  entries: PortfolioContributionEntry[],
  portfolioBaseCurrency: PortfolioBaseCurrency,
): boolean {
  return entries.some(
    (entry) =>
      isValidEntry(entry, portfolioBaseCurrency) &&
      entry.entryType === "contribution" &&
      entry.source === "opening_balance",
  );
}

/**
 * True when the ledger is a credible funding basis for value-vs-contributions.
 * Incomplete ledgers (e.g. a small top-up vs a large portfolio) must not look
 * like portfolio return.
 */
export function isContributionBasisReliable(input: {
  entries: PortfolioContributionEntry[];
  netContributed: number;
  currentValue: number | null;
  portfolioBaseCurrency: PortfolioBaseCurrency;
}): boolean {
  if (
    hasOpeningBalanceContribution(
      input.entries,
      input.portfolioBaseCurrency,
    )
  ) {
    return true;
  }

  if (
    input.currentValue == null ||
    !(input.currentValue > 0) ||
    !(input.netContributed > 0)
  ) {
    return false;
  }

  return (
    input.netContributed / input.currentValue >=
    CONTRIBUTION_BASIS_MIN_COVERAGE_RATIO
  );
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

  const contributionBasisReliable = isContributionBasisReliable({
    entries,
    netContributed,
    currentValue,
    portfolioBaseCurrency,
  });

  let valueAboveContributions: number | null = null;
  let valueAboveContributionsPercent: number | null = null;

  if (
    currentValue != null &&
    hasContributionData &&
    contributionBasisReliable
  ) {
    valueAboveContributions = currentValue - netContributed;

    if (netContributed > 0) {
      const percent = (valueAboveContributions / netContributed) * 100;
      valueAboveContributionsPercent = Number.isFinite(percent)
        ? percent
        : null;
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
    contributionBasisReliable,
  };
}
