import { classifyMarketConsensusHolding, isCryptoLinkedHolding } from "@/lib/client/marketConsensus/holdingClassification";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { buildStaticConsensusResult } from "@/lib/services/marketConsensus/providers/registry";
import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";
import { validateAndSanitizeConsensusResult } from "@/lib/services/marketConsensus/validateConsensusResult";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const SOFT_ERROR_CODES = new Set([
  "provider_unavailable",
  "no_coverage",
  "not_found",
  "unsupported",
  "unsupported_instrument",
]);

export function shouldUseEtfNeutralFallback(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
  result?: AnalystConsensusResult | null,
): boolean {
  if (isCryptoLinkedHolding(holding)) {
    return false;
  }

  if (classifyMarketConsensusHolding(holding) === "etf") {
    return true;
  }

  if (inferAnalystCoverageKind(holding) === "fund_or_etc") {
    return true;
  }

  return result?.coverageType === "underlying-market";
}

export function isSoftConsensusFailure(
  result: AnalystConsensusResult,
): boolean {
  if (result.availability !== "error") {
    return false;
  }

  if (!result.errorCode) {
    return true;
  }

  return SOFT_ERROR_CODES.has(result.errorCode);
}

export function isTechnicalConsensusFailure(
  result: AnalystConsensusResult,
): boolean {
  return result.availability === "error" && !isSoftConsensusFailure(result);
}

/** Downgrades provider coverage misses to neutral ETF/equity unavailable states. */
export function normalizeConsensusResultForHolding(
  holding: StoredPortfolioHolding,
  result: AnalystConsensusResult,
): AnalystConsensusResult {
  if (shouldUseEtfNeutralFallback(holding, result)) {
    const staticResult = buildStaticConsensusResult(holding);

    if (
      result.availability === "error" ||
      isSoftConsensusFailure(result) ||
      result.coverageType === "equity-analyst"
    ) {
      return validateAndSanitizeConsensusResult({
        ...staticResult,
        summary: result.summary ?? staticResult.summary,
        positiveFactors: result.positiveFactors,
        riskFactors: result.riskFactors,
        narrativeSource: result.narrativeSource,
      });
    }

    return validateAndSanitizeConsensusResult({
      ...result,
      coverageType: "underlying-market",
      availability:
        result.availability === "available" ? result.availability : "unavailable",
      classification: "unavailable",
      errorCode: undefined,
    });
  }

  if (isSoftConsensusFailure(result)) {
    return validateAndSanitizeConsensusResult({
      ...buildStaticConsensusResult(holding),
      summary: result.summary ?? buildStaticConsensusResult(holding).summary,
      positiveFactors: result.positiveFactors,
      riskFactors: result.riskFactors,
      narrativeSource: result.narrativeSource,
      sourceName: result.sourceName,
      updatedAt: result.updatedAt,
    });
  }

  return result;
}
