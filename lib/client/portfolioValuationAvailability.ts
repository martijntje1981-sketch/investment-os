import { buildValuedPositions, type AnalysisHolding } from "@/lib/client/portfolioAnalysis";
import { resolvePortfolioValuationCoverage } from "@/lib/client/portfolioValuationCoverage";

export type PortfolioTotalValueAvailability = {
  totalValue: number;
  isAvailable: boolean;
  isPartial: boolean;
  valuedHoldingCount: number;
  unvaluedInvestmentCount: number;
  coverageMessage: string | null;
};

export function resolvePortfolioTotalValueAvailability(
  holdings: AnalysisHolding[],
): PortfolioTotalValueAvailability {
  const { valuedPositions, unvaluedHoldings, totalValue } =
    buildValuedPositions(holdings);

  const investmentHoldings = holdings.filter(
    (holding) => holding.assetType !== "cash" && holding.quantity > 0,
  );
  const unvaluedInvestments = unvaluedHoldings.filter(
    (holding) => holding.assetType !== "cash" && holding.quantity > 0,
  );
  const valuedInvestments = valuedPositions.filter(
    (position) => position.holding.assetType !== "cash",
  );

  const hasInvestments = investmentHoldings.length > 0;
  const hasValuedInvestments = valuedInvestments.length > 0;
  const hasUnvaluedInvestments = unvaluedInvestments.length > 0;

  const coverage = resolvePortfolioValuationCoverage(holdings);

  if (!hasInvestments) {
    return {
      totalValue,
      isAvailable: totalValue > 0 || holdings.some((holding) => holding.assetType === "cash"),
      isPartial: false,
      valuedHoldingCount: valuedPositions.length,
      unvaluedInvestmentCount: 0,
      coverageMessage: null,
    };
  }

  if (!hasValuedInvestments) {
    return {
      totalValue: 0,
      isAvailable: false,
      isPartial: false,
      valuedHoldingCount: 0,
      unvaluedInvestmentCount: unvaluedInvestments.length,
      coverageMessage: "Total value unavailable until market prices are available.",
    };
  }

  if (hasUnvaluedInvestments) {
    return {
      totalValue,
      isAvailable: true,
      isPartial: true,
      valuedHoldingCount: valuedPositions.length,
      unvaluedInvestmentCount: unvaluedInvestments.length,
      coverageMessage:
        coverage.coverageMessage ??
        `${unvaluedInvestments.length} holding${unvaluedInvestments.length === 1 ? "" : "s"} excluded until market prices are available.`,
    };
  }

  return {
    totalValue,
    isAvailable: true,
    isPartial: false,
    valuedHoldingCount: valuedPositions.length,
    unvaluedInvestmentCount: 0,
    coverageMessage: null,
  };
}

export function formatPortfolioTotalValueLabel(
  availability: PortfolioTotalValueAvailability,
  formatter: (value: number) => string,
): string {
  if (!availability.isAvailable) {
    return "Unavailable";
  }

  return formatter(availability.totalValue);
}
