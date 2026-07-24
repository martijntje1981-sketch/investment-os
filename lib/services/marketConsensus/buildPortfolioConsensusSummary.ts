import type {
  AnalystConsensusResult,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function buildPortfolioConsensusSummary(
  holdings: StoredPortfolioHolding[],
  results: AnalystConsensusResult[],
  options: {
    providerAvailable: boolean;
    generatedAt?: string;
  },
): PortfolioConsensusSummary {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  const resultById = new Map(results.map((result) => [result.instrumentId, result]));

  let holdingsWithCoverage = 0;
  let positiveConsensus = 0;
  let mixedConsensus = 0;
  let limitedCoverage = 0;

  for (const holding of investments) {
    const result = resultById.get(holding.id);
    if (!result) {
      limitedCoverage += 1;
      continue;
    }

    if (result.availability === "available") {
      holdingsWithCoverage += 1;
    }

    if (result.classification === "positive") {
      positiveConsensus += 1;
    } else if (result.classification === "mixed") {
      mixedConsensus += 1;
    }

    if (
      result.availability === "limited" ||
      result.availability === "unavailable" ||
      result.availability === "error"
    ) {
      limitedCoverage += 1;
    }
  }

  const summary =
    holdingsWithCoverage > 0
      ? `Third-party analyst coverage is available for ${holdingsWithCoverage} of ${investments.length} investment holdings.`
      : options.providerAvailable
        ? "No reliable third-party analyst consensus is currently available for your investment holdings."
        : "Third-party consensus data is temporarily unavailable. Your portfolio performance and allocation data remain available.";

  return {
    summary,
    holdingsWithCoverage,
    positiveConsensus,
    mixedConsensus,
    limitedCoverage,
    totalInvestments: investments.length,
    providerAvailable: options.providerAvailable,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}
