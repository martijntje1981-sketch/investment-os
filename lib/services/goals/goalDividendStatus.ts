import type { PassiveIncomeProjectionSnapshot } from "@/lib/types/dividends";

export type GoalDividendReliability = "reliable" | "partial" | "unavailable";

export function getGoalDividendReliability(
  projection: PassiveIncomeProjectionSnapshot,
): GoalDividendReliability {
  if (projection.hasUsableEstimate) {
    return "reliable";
  }

  if (
    projection.eligibleHoldingsCount > 0 ||
    projection.awaitingDataHoldingsCount > 0 ||
    projection.updatedAt
  ) {
    return "partial";
  }

  return "unavailable";
}

export function buildGoalDividendMessage(
  reliability: GoalDividendReliability,
  projection: PassiveIncomeProjectionSnapshot,
): string {
  switch (reliability) {
    case "reliable":
      return `Based on ${projection.contributingHoldingsCount} eligible holding${projection.contributingHoldingsCount === 1 ? "" : "s"}. Estimates are not guaranteed distributions.`;
    case "partial":
      if (projection.eligibleHoldingsCount > 0 && !projection.hasUsableEstimate) {
        return "Some eligible holdings lack reliable annual distribution data. Figures may be incomplete.";
      }
      return "Some holdings are excluded because their distribution policy or income data is not verified.";
    default:
      return "Passive-income estimates are temporarily unavailable for the current portfolio.";
  }
}
