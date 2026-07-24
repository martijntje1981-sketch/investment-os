import type { ValuedPosition } from "@/lib/client/portfolioAnalysis";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import {
  findConsensusResultForHolding,
  formatConsensusUpdatedAt,
} from "@/lib/client/marketConsensus/consensusHelpers";
import { classifyMarketConsensusHolding } from "@/lib/client/marketConsensus/holdingClassification";
import type {
  MarketConsensusCardState,
  MarketConsensusCoverageType,
  MarketConsensusHoldingCardModel,
  MarketConsensusPortfolioSummaryModel,
  MarketConsensusStatusLabel,
} from "@/lib/client/marketConsensus/types";
import {
  MARKET_CONSENSUS_CRYPTO_DISCLAIMER,
  MARKET_CONSENSUS_NARRATIVE_TOOLTIP,
  MARKET_CONSENSUS_UNAVAILABLE_COPY,
  MARKET_CONSENSUS_UNAVAILABLE_TITLE,
} from "@/lib/client/marketConsensus/types";
import {
  agreementLevelLabel,
  classificationStatusLabel,
} from "@/lib/services/marketConsensus/validateConsensusResult";
import type {
  AnalystConsensusResult,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function mapCoverageType(result: AnalystConsensusResult): MarketConsensusCoverageType {
  switch (result.coverageType) {
    case "equity-analyst":
      return "Analyst coverage";
    case "underlying-market":
      return "Underlying market outlook";
    case "crypto-market-outlook":
      return "Market outlook";
    default:
      return "No reliable coverage";
  }
}

function mapCardState(
  holding: StoredPortfolioHolding,
  result: AnalystConsensusResult | null,
  isLoading: boolean,
): MarketConsensusCardState {
  if (isLoading && !result) {
    return "loading";
  }

  if (result?.availability === "error") {
    return "error";
  }

  const category = classifyMarketConsensusHolding(holding);

  if (category === "etf") {
    return "etf_outlook";
  }

  if (category === "crypto_etp") {
    return "crypto_outlook";
  }

  if (
    result?.availability === "available" &&
    result.coverageType === "equity-analyst"
  ) {
    return "equity_coverage";
  }

  return "no_coverage";
}

function mapStatusLabel(
  result: AnalystConsensusResult | null,
  state: MarketConsensusCardState,
): MarketConsensusStatusLabel | null {
  if (state === "etf_outlook") {
    return "Underlying market outlook";
  }

  if (state === "crypto_outlook") {
    return "Market outlook";
  }

  if (state === "no_coverage" || state === "loading" || state === "error") {
    return result?.availability === "limited" ? "Limited coverage" : "Limited coverage";
  }

  return classificationStatusLabel(result?.classification ?? "unavailable");
}

function buildPriceTargetLabel(result: AnalystConsensusResult | null): string | null {
  if (
    result?.averageTarget == null ||
    !Number.isFinite(result.averageTarget) ||
    result.averageTarget <= 0
  ) {
    return null;
  }

  return `Third-party price targets: ${formatPortfolioCurrency(result.averageTarget)}`;
}

function buildImpliedUpsideLabel(result: AnalystConsensusResult | null): string | null {
  if (
    result?.impliedUpsidePercent == null ||
    !Number.isFinite(result.impliedUpsidePercent)
  ) {
    return null;
  }

  const prefix = result.impliedUpsidePercent >= 0 ? "+" : "";
  return `Consensus-implied upside: ${prefix}${result.impliedUpsidePercent.toFixed(1)}%`;
}

function buildSummaryCopy(
  holding: StoredPortfolioHolding,
  result: AnalystConsensusResult | null,
  state: MarketConsensusCardState,
): string {
  if (state === "etf_outlook") {
    return (
      result?.summary ??
      "Underlying market outlook data is not available for this ETF yet. ETF holdings are assessed via broader market research rather than single-instrument analyst ratings."
    );
  }

  if (state === "crypto_outlook") {
    return (
      result?.summary ??
      "Market outlook data is not available for this crypto-linked holding yet."
    );
  }

  if (state === "error") {
    return MARKET_CONSENSUS_UNAVAILABLE_COPY;
  }

  if (state === "equity_coverage" && result?.summary) {
    return result.summary;
  }

  if (result?.narrativeSource && result.summary) {
    return result.summary;
  }

  return result?.summary ?? MARKET_CONSENSUS_UNAVAILABLE_COPY;
}

function buildErrorMessage(result: AnalystConsensusResult | null): string | undefined {
  if (result?.availability !== "error") {
    return undefined;
  }

  return "Consensus data could not be loaded for this holding. Your performance and allocation data remain available.";
}

export function mapConsensusResultToCard(input: {
  holding: StoredPortfolioHolding;
  position?: ValuedPosition;
  result: AnalystConsensusResult | null;
  isLoading: boolean;
}): MarketConsensusHoldingCardModel {
  const { holding, position, result, isLoading } = input;
  const state = mapCardState(holding, result, isLoading);
  const category = classifyMarketConsensusHolding(holding);

  const weightPercent = position?.weightPercent ?? null;
  const currentValueLabel =
    position != null ? formatPortfolioCurrency(position.value) : null;

  const showEquityDistribution =
    state === "equity_coverage" &&
    result?.buyCount != null &&
    result.holdCount != null &&
    result.sellCount != null;

  const sourceLabel =
    result?.sourceName && result.availability === "available"
      ? result.isStale
        ? `${result.sourceName} (cached)`
        : result.sourceName
      : null;

  const updatedAtLabel =
    result?.updatedAt && (result.availability === "available" || result.isStale)
      ? formatConsensusUpdatedAt(result.updatedAt)
      : null;

  return {
    id: holding.id,
    state,
    symbol: holding.symbol,
    name: holding.name,
    weightPercent,
    currentValueLabel,
    coverageType: result ? mapCoverageType(result) : mapCoverageType({
      instrumentId: holding.id,
      coverageType:
        category === "etf"
          ? "underlying-market"
          : category === "crypto_etp"
            ? "crypto-market-outlook"
            : "unavailable",
      availability: "unavailable",
      classification: "unavailable",
    }),
    statusLabel: mapStatusLabel(result, state),
    analystAgreementLabel:
      state === "equity_coverage"
        ? agreementLevelLabel(result?.agreementLevel)
        : null,
    ratingDistribution:
      showEquityDistribution && result
        ? {
            buy: result.buyCount ?? 0,
            hold: result.holdCount ?? 0,
            sell: result.sellCount ?? 0,
          }
        : null,
    priceTargetLabel:
      state === "equity_coverage" ? buildPriceTargetLabel(result) : null,
    impliedUpsideLabel:
      state === "equity_coverage" ? buildImpliedUpsideLabel(result) : null,
    summary: buildSummaryCopy(holding, result, state),
    supportingFactors: result?.positiveFactors ?? [],
    keyRisks: result?.riskFactors ?? [],
    sourceLabel,
    updatedAtLabel,
    cryptoDisclaimer:
      state === "crypto_outlook" ? MARKET_CONSENSUS_CRYPTO_DISCLAIMER : undefined,
    unavailableTitle:
      state === "no_coverage" && result?.availability === "unavailable"
        ? MARKET_CONSENSUS_UNAVAILABLE_TITLE
        : undefined,
    unavailableCopy:
      state === "no_coverage" && result?.availability === "unavailable"
        ? MARKET_CONSENSUS_UNAVAILABLE_COPY
        : undefined,
    errorMessage: buildErrorMessage(result),
    narrativeLabel:
      result?.narrativeSource === "ai"
        ? "AI summary of third-party data"
        : null,
    narrativeTooltip:
      result?.narrativeSource === "ai"
        ? MARKET_CONSENSUS_NARRATIVE_TOOLTIP
        : null,
    isDemoData: false,
    holding,
  };
}

export function mapPortfolioSummaryToViewModel(
  summary: PortfolioConsensusSummary,
): MarketConsensusPortfolioSummaryModel {
  return {
    summary: summary.summary,
    holdingsWithCoverage: summary.holdingsWithCoverage,
    positiveConsensus: summary.positiveConsensus,
    mixedConsensus: summary.mixedConsensus,
    limitedCoverage: summary.limitedCoverage,
    isDemoData: false,
  };
}

export function buildLoadingConsensusCard(
  holding: StoredPortfolioHolding,
  position?: ValuedPosition,
): MarketConsensusHoldingCardModel {
  return mapConsensusResultToCard({
    holding,
    position,
    result: null,
    isLoading: true,
  });
}

export function indexConsensusResults(
  results: AnalystConsensusResult[],
): Map<string, AnalystConsensusResult> {
  return new Map(results.map((result) => [result.instrumentId, result]));
}

export function lookupConsensusResult(
  holding: StoredPortfolioHolding,
  results: AnalystConsensusResult[] | Map<string, AnalystConsensusResult>,
): AnalystConsensusResult | null {
  if (results instanceof Map) {
    return results.get(holding.id) ?? null;
  }

  return findConsensusResultForHolding(holding, results);
}
