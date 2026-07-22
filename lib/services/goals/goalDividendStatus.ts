import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

export type GoalDividendReliability = "reliable" | "partial" | "unavailable";

export function getGoalDividendReliability(
  snapshot: PortfolioDividendSnapshot,
): GoalDividendReliability {
  if (snapshot.hasDividendData && snapshot.estimatedAnnualIncomeEur > 0) {
    return "reliable";
  }

  if (snapshot.payingHoldingsCount > 0 || snapshot.updatedAt) {
    return "partial";
  }

  return "unavailable";
}

export function buildGoalDividendMessage(
  reliability: GoalDividendReliability,
): string {
  switch (reliability) {
    case "reliable":
      return "Estimated from verified dividend data on matched holdings.";
    case "partial":
      return "Some holdings lack reliable dividend data. Figures may be incomplete.";
    default:
      return "Dividend estimates are temporarily unavailable for the current portfolio.";
  }
}
