import type {
  ContributionDestinationType,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

export function normalizeDestinationType(
  value: unknown,
): ContributionDestinationType {
  return value === "holding" ? "holding" : "cash";
}

/** Unspecified destination is funding, not a cash-holding claim. */
export const PORTFOLIO_DESTINATION_LABEL = "Portfolio";
export const HOLDING_DESTINATION_KIND_LABEL = "Holding";
export const CONTRIBUTION_HOLDING_OR_PORTFOLIO_MESSAGE =
  "Choose an investment holding, or record it as a portfolio contribution.";

export function contributionDestinationKindLabel(
  entry: Pick<PortfolioContributionEntry, "destinationType">,
): string {
  return entry.destinationType === "holding"
    ? HOLDING_DESTINATION_KIND_LABEL
    : PORTFOLIO_DESTINATION_LABEL;
}

export function contributionDestinationLabel(
  entry: Pick<
    PortfolioContributionEntry,
    "destinationType" | "destinationHoldingSymbol"
  >,
): string {
  if (entry.destinationType === "holding") {
    return entry.destinationHoldingSymbol?.trim() || HOLDING_DESTINATION_KIND_LABEL;
  }
  return PORTFOLIO_DESTINATION_LABEL;
}

export function formatContributionDestinationLines(
  entry: PortfolioContributionEntry,
  formatMoney: (amount: number) => string,
): string[] {
  const lines = [
    `Destination: ${contributionDestinationLabel(entry)}`,
  ];

  if (entry.destinationType !== "holding") {
    return lines;
  }

  if (
    entry.destinationQuantity != null &&
    Number.isFinite(entry.destinationQuantity)
  ) {
    lines.push(
      `Quantity: ${entry.destinationQuantity.toLocaleString("en-GB", {
        maximumFractionDigits: 8,
      })}`,
    );
  }

  if (
    entry.destinationPricePerUnit != null &&
    Number.isFinite(entry.destinationPricePerUnit)
  ) {
    lines.push(`Price: ${formatMoney(entry.destinationPricePerUnit)}`);
  }

  if (
    entry.destinationFee != null &&
    Number.isFinite(entry.destinationFee) &&
    entry.destinationFee > 0
  ) {
    lines.push(`Fee: ${formatMoney(entry.destinationFee)}`);
  }

  return lines;
}

/** Holding allocation is display metadata only — never added to cash-flow totals. */
export function contributionCountsTowardCashFlowOnly(
  entry: PortfolioContributionEntry,
): number {
  return entry.baseAmount;
}
