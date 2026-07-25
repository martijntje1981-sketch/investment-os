import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type {
  DistributionPolicyClassification,
  PortfolioDistributionPolicySnapshot,
} from "@/lib/types/distributionPolicy";
import type { DividendApiQuote } from "@/lib/types/dividends";
import {
  buildPortfolioDistributionPolicySnapshot,
  classifyDistributionPolicy,
  findDividendQuoteForClassification,
} from "@/lib/services/dividends/classifyDistributionPolicy";

export type DistributionPolicyHoldingViewModel = {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
};

export type DistributionPolicyViewModel = {
  summary: PortfolioDistributionPolicySnapshot["summary"];
  holdings: DistributionPolicyHoldingViewModel[];
  generatedAt: string;
};

export function buildDistributionPolicyViewModel(input: {
  holdings: StoredPortfolioHolding[];
  quotes: DividendApiQuote[];
}): DistributionPolicyViewModel {
  const snapshot = buildPortfolioDistributionPolicySnapshot(
    input.holdings,
    input.quotes,
  );

  const investments = input.holdings.filter(
    (holding) => holding.assetType !== "cash",
  );

  return {
    summary: snapshot.summary,
    generatedAt: snapshot.generatedAt,
    holdings: investments.map((holding) => ({
      holding,
      classification: classifyDistributionPolicy({
        holding,
        dividendQuote: findDividendQuoteForClassification(holding, input.quotes),
      }),
    })),
  };
}

export function policyStatusLabel(
  policy: DistributionPolicyClassification["policy"],
): string {
  switch (policy) {
    case "distributing":
      return "Distributing";
    case "accumulating":
      return "Accumulating";
    case "not_applicable":
      return "Not applicable";
    default:
      return "Unknown";
  }
}

export function confidenceBadgeLabel(
  classification: DistributionPolicyClassification,
): string {
  if (classification.isUserConfirmed) {
    return "User confirmed";
  }
  if (classification.isReviewedOverride) {
    return "Reviewed";
  }
  if (classification.classificationConfidence === "verified") {
    return "Verified";
  }
  return "Unverified";
}

export function formatPolicyUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
