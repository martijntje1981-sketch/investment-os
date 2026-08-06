import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

export function activityTypeLabel(
  entry: PortfolioContributionEntry,
): string {
  if (entry.source === "opening_balance") {
    return "Opening contribution";
  }
  if (entry.entryType === "withdrawal") {
    return "Withdrawal";
  }
  if (entry.source === "import") {
    return "Contribution (imported)";
  }
  return "Contribution";
}

export function activitySourceLabel(
  entry: PortfolioContributionEntry,
): string {
  switch (entry.source) {
    case "opening_balance":
      return "Opening balance";
    case "import":
      return "Import";
    default:
      return "Manual";
  }
}
