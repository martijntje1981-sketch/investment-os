import type { ValuedPosition } from "@/lib/client/portfolioAnalysis";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import {
  findConsensusResultForHolding,
  formatConsensusUpdatedAt,
} from "@/lib/client/marketConsensus/consensusHelpers";
import {
  classifyMarketConsensusHolding,
  resolveNotApplicableStatusLabel,
} from "@/lib/client/marketConsensus/holdingClassification";
import {
  normalizeConsensusResultForHolding,
  shouldUseEtfNeutralFallback,
} from "@/lib/services/marketConsensus/normalizeConsensusAvailability";
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

function hasEquityAnalystData(result: AnalystConsensusResult): boolean {
  return (
    result.coverageType === "equity-analyst" &&
    ((result.analystCount ?? 0) > 0 ||
      result.buyCount != null ||
      result.averageTarget != null)
  );
}

function mapCoverageType(
  result: AnalystConsensusResult,
  holding: StoredPortfolioHolding,
): MarketConsensusCoverageType {
  const notApplicable = resolveNotApplicableStatusLabel(holding);
  if (notApplicable) {
    return "Not applicable";
  }

  switch (result.coverageType) {
    case "equity-analyst":
      if (
        result.availability === "available" ||
        (result.availability === "limited" && (result.analystCount ?? 0) > 0)
      ) {
        return "Analyst coverage";
      }
      return "No analyst coverage";
    case "underlying-market":
      return "Not applicable";
    case "crypto-market-outlook":
      return "Not applicable";
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

  const normalizedResult = result
    ? normalizeConsensusResultForHolding(holding, result)
    : null;

  const category = classifyMarketConsensusHolding(holding);

  if (category === "crypto_etp") {
    return "crypto_outlook";
  }

  if (shouldUseEtfNeutralFallback(holding, normalizedResult)) {
    return "etf_outlook";
  }

  if (normalizedResult?.availability === "error") {
    return "error";
  }

  if (
    normalizedResult?.availability === "available" &&
    normalizedResult.coverageType === "equity-analyst"
  ) {
    return "equity_coverage";
  }

  if (
    normalizedResult?.availability === "limited" &&
    normalizedResult.coverageType === "equity-analyst" &&
    hasEquityAnalystData(normalizedResult)
  ) {
    return "partial_equity_coverage";
  }

  return "no_coverage";
}

function mapStatusLabel(
  holding: StoredPortfolioHolding,
  result: AnalystConsensusResult | null,
  state: MarketConsensusCardState,
): MarketConsensusStatusLabel | null {
  if (state === "etf_outlook" || state === "crypto_outlook") {
    return (
      resolveNotApplicableStatusLabel(holding) ??
      (state === "crypto_outlook"
        ? "Not applicable — crypto"
        : "Not applicable — ETF")
    );
  }

  if (state === "error") {
    if (result?.errorCode === "provider_unavailable") {
      return "Analyst data temporarily unavailable";
    }
    if (
      result?.errorCode === "not_found" ||
      result?.errorCode === "unsupported" ||
      result?.errorCode === "unsupported_instrument"
    ) {
      return "Symbol could not be resolved";
    }
    return "Analyst data temporarily unavailable";
  }

  if (state === "partial_equity_coverage") {
    return "Partial analyst coverage";
  }

  if (state === "no_coverage" || state === "loading") {
    return "No analyst coverage";
  }

  if (state === "equity_coverage") {
    return (
      classificationStatusLabel(result?.classification ?? "unavailable") ??
      "Analyst coverage"
    );
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

  const currency = result.targetCurrency ?? result.listingCurrency ?? "EUR";
  return `Third-party price target: ${formatPortfolioCurrency(
    result.averageTarget,
    currency,
    currency === "USD" ? 2 : 0,
  )}`;
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

function buildAnalystCountLabel(result: AnalystConsensusResult | null): string | null {
  if (result?.analystCount == null || result.analystCount <= 0) {
    return null;
  }

  return `${result.analystCount} analysts`;
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
    return (
      result?.summary ??
      "Analyst data is temporarily unavailable for this holding. Your performance and allocation data remain available."
    );
  }

  if (
    (state === "equity_coverage" || state === "partial_equity_coverage") &&
    result?.summary
  ) {
    return result.summary;
  }

  if (result?.narrativeSource && result.summary) {
    return result.summary;
  }

  return result?.summary ?? MARKET_CONSENSUS_UNAVAILABLE_COPY;
}

function buildErrorMessage(
  holding: StoredPortfolioHolding,
  result: AnalystConsensusResult | null,
  state: MarketConsensusCardState,
): string | undefined {
  if (state !== "error" || result?.availability !== "error") {
    return undefined;
  }

  if (shouldUseEtfNeutralFallback(holding, result)) {
    return undefined;
  }

  if (result.errorCode === "provider_unavailable") {
    return "Analyst data is temporarily unavailable for this holding. Your performance and allocation data remain available.";
  }

  return "Consensus data could not be loaded for this holding. Your performance and allocation data remain available.";
}

function showsEquityAnalystDetails(state: MarketConsensusCardState): boolean {
  return state === "equity_coverage" || state === "partial_equity_coverage";
}

function showsSourceMetadata(
  result: AnalystConsensusResult | null,
  state: MarketConsensusCardState,
): boolean {
  if (!result?.sourceName) {
    return false;
  }

  return (
    state === "equity_coverage" ||
    state === "partial_equity_coverage" ||
    result.isStale === true
  );
}

export function mapConsensusResultToCard(input: {
  holding: StoredPortfolioHolding;
  position?: ValuedPosition;
  result: AnalystConsensusResult | null;
  isLoading: boolean;
}): MarketConsensusHoldingCardModel {
  const { holding, position, isLoading } = input;
  const result =
    input.result != null
      ? normalizeConsensusResultForHolding(holding, input.result)
      : null;
  const state = mapCardState(holding, result, isLoading);
  const category = classifyMarketConsensusHolding(holding);

  const weightPercent = position?.weightPercent ?? null;
  const currentValueLabel =
    position != null ? formatPortfolioCurrency(position.value) : null;

  const showEquityDistribution =
    showsEquityAnalystDetails(state) &&
    result?.buyCount != null &&
    result.holdCount != null &&
    result.sellCount != null;

  const sourceLabel = showsSourceMetadata(result, state)
    ? result?.isStale
      ? `${result.sourceName} (cached)`
      : (result?.sourceName ?? null)
    : null;

  const updatedAtLabel =
    result?.updatedAt &&
    (showsEquityAnalystDetails(state) || result.isStale)
      ? formatConsensusUpdatedAt(result.updatedAt)
      : null;

  return {
    id: holding.id,
    state,
    symbol: holding.symbol,
    name: holding.name,
    weightPercent,
    currentValueLabel,
    coverageType: result
      ? mapCoverageType(result, holding)
      : mapCoverageType(
          {
            instrumentId: holding.id,
            coverageType:
              category === "etf"
                ? "underlying-market"
                : category === "crypto_etp"
                  ? "crypto-market-outlook"
                  : "unavailable",
            availability: "unavailable",
            classification: "unavailable",
          },
          holding,
        ),
    statusLabel: mapStatusLabel(holding, result, state),
    analystAgreementLabel:
      showsEquityAnalystDetails(state)
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
    priceTargetLabel: showsEquityAnalystDetails(state)
      ? buildPriceTargetLabel(result)
      : null,
    impliedUpsideLabel: showsEquityAnalystDetails(state)
      ? buildImpliedUpsideLabel(result)
      : null,
    targetCurrencyNote:
      showsEquityAnalystDetails(state) ? result?.targetCurrencyNote ?? null : null,
    analystCountLabel: showsEquityAnalystDetails(state)
      ? buildAnalystCountLabel(result)
      : null,
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
    errorMessage: buildErrorMessage(holding, result, state),
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
    negativeConsensus: summary.negativeConsensus,
    noAnalystCoverage: summary.noAnalystCoverage,
    notApplicable: summary.notApplicable,
    eligibleHoldings: summary.eligibleHoldings,
    providerUnavailable: summary.providerUnavailable,
    symbolMappingIssues: summary.symbolMappingIssues,
    limitedCoverage: summary.noAnalystCoverage,
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
