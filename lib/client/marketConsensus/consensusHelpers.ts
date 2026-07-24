import type { AnalystConsensusResult, PortfolioConsensusSummary } from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function findConsensusResultForHolding(
  holding: StoredPortfolioHolding,
  results: AnalystConsensusResult[],
): AnalystConsensusResult | null {
  return results.find((result) => result.instrumentId === holding.id) ?? null;
}

export function formatConsensusUpdatedAt(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function emptyPortfolioConsensusSummary(
  investmentCount: number,
): PortfolioConsensusSummary {
  return {
    summary:
      "Third-party consensus data is temporarily unavailable. Your portfolio performance and allocation data remain available.",
    holdingsWithCoverage: 0,
    positiveConsensus: 0,
    mixedConsensus: 0,
    limitedCoverage: investmentCount,
    totalInvestments: investmentCount,
    providerAvailable: false,
    generatedAt: new Date().toISOString(),
  };
}
