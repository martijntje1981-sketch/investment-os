import {
  isConsensusEligibleHolding,
} from "@/lib/client/marketConsensus/holdingClassification";
import type {
  AnalystConsensusResult,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function hasUsableEquityAnalystData(result: AnalystConsensusResult): boolean {
  return (
    result.coverageType === "equity-analyst" &&
    (result.availability === "available" ||
      (result.availability === "limited" && (result.analystCount ?? 0) > 0) ||
      ((result.analystCount ?? 0) > 0 && result.availability !== "error"))
  );
}

function isProviderUnavailable(result: AnalystConsensusResult): boolean {
  return (
    result.availability === "error" &&
    result.errorCode === "provider_unavailable"
  );
}

function isSymbolMappingIssue(result: AnalystConsensusResult): boolean {
  return (
    result.availability === "error" &&
    (result.errorCode === "not_found" ||
      result.errorCode === "unsupported" ||
      result.errorCode === "unsupported_instrument")
  );
}

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
  let negativeConsensus = 0;
  let noAnalystCoverage = 0;
  let notApplicable = 0;
  let eligibleHoldings = 0;
  let providerUnavailable = 0;
  let symbolMappingIssues = 0;

  for (const holding of investments) {
    const eligible = isConsensusEligibleHolding(holding);
    const result = resultById.get(holding.id);

    if (!eligible) {
      notApplicable += 1;
      continue;
    }

    eligibleHoldings += 1;

    if (!result) {
      noAnalystCoverage += 1;
      continue;
    }

    if (isProviderUnavailable(result)) {
      providerUnavailable += 1;
      continue;
    }

    if (isSymbolMappingIssue(result)) {
      symbolMappingIssues += 1;
      continue;
    }

    if (hasUsableEquityAnalystData(result)) {
      holdingsWithCoverage += 1;
      if (result.classification === "positive") {
        positiveConsensus += 1;
      } else if (result.classification === "mixed") {
        mixedConsensus += 1;
      } else if (result.classification === "negative") {
        negativeConsensus += 1;
      }
      continue;
    }

    noAnalystCoverage += 1;
  }

  let summary: string;
  if (eligibleHoldings === 0) {
    summary =
      "Analyst consensus applies to individual company shares. Your current portfolio mainly contains funds, ETPs or crypto-linked instruments.";
  } else if (holdingsWithCoverage > 0) {
    summary = `Third-party analyst coverage is available for ${holdingsWithCoverage} of ${eligibleHoldings} consensus-eligible holdings.`;
  } else if (!options.providerAvailable || providerUnavailable === eligibleHoldings) {
    summary =
      "Third-party consensus data is temporarily unavailable. Your portfolio performance and allocation data remain available.";
  } else {
    summary =
      "No third-party analyst consensus is currently available for your consensus-eligible holdings.";
  }

  return {
    summary,
    holdingsWithCoverage,
    positiveConsensus,
    mixedConsensus,
    negativeConsensus,
    noAnalystCoverage,
    notApplicable,
    eligibleHoldings,
    providerUnavailable,
    symbolMappingIssues,
    /** @deprecated Prefer noAnalystCoverage — retained for transitional callers. */
    limitedCoverage: noAnalystCoverage,
    totalInvestments: investments.length,
    providerAvailable: options.providerAvailable,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}
