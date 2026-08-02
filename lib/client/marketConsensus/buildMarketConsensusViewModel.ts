import type { ValuedPosition } from "@/lib/client/portfolioAnalysis";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { buildMarketConsensusDemoPreviewCards } from "@/lib/client/marketConsensus/demoData";
import {
  buildLoadingConsensusCard,
  indexConsensusResults,
  lookupConsensusResult,
  mapConsensusResultToCard,
  mapPortfolioSummaryToViewModel,
} from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import type {
  MarketConsensusHoldingCardModel,
  MarketConsensusViewModel,
} from "@/lib/client/marketConsensus/types";
import type {
  AnalystConsensusResult,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function shouldShowUiStatePreview(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW === "true"
  );
}

function buildProductionHoldingCards(input: {
  valuedPositions: ValuedPosition[];
  unvaluedHoldings: StoredPortfolioHolding[];
  results: AnalystConsensusResult[];
  isLoading: boolean;
}): MarketConsensusHoldingCardModel[] {
  const resultsById = indexConsensusResults(input.results);

  const valuedCards = input.valuedPositions
    .filter((position) => position.holding.assetType !== "cash")
    .map((position) => {
      const result = lookupConsensusResult(position.holding, resultsById);
      if (input.isLoading && !result) {
        return buildLoadingConsensusCard(position.holding, position);
      }

      return mapConsensusResultToCard({
        holding: position.holding,
        position,
        result,
        isLoading: false,
      });
    });

  const unvaluedCards = input.unvaluedHoldings
    .filter((holding) => holding.assetType !== "cash")
    .map((holding) => {
      const result = lookupConsensusResult(holding, resultsById);
      if (input.isLoading && !result) {
        return buildLoadingConsensusCard(holding);
      }

      return mapConsensusResultToCard({
        holding,
        result,
        isLoading: false,
      });
    });

  return [...valuedCards, ...unvaluedCards];
}

export function buildMarketConsensusViewModel(input: {
  valuedPositions: ValuedPosition[];
  unvaluedHoldings: StoredPortfolioHolding[];
  results?: AnalystConsensusResult[];
  summary?: PortfolioConsensusSummary;
  isLoading?: boolean;
}): MarketConsensusViewModel {
  const results = input.results ?? [];
  const isLoading = input.isLoading ?? false;
  const investmentValued = input.valuedPositions.filter(
    (position) => position.holding.assetType !== "cash",
  );
  const investmentUnvalued = input.unvaluedHoldings.filter(
    (holding) => holding.assetType !== "cash",
  );
  const investmentCount = investmentValued.length + investmentUnvalued.length;

  const productionCards = buildProductionHoldingCards({
    valuedPositions: input.valuedPositions,
    unvaluedHoldings: input.unvaluedHoldings,
    results,
    isLoading,
  });

  const portfolioSummary = input.summary
    ? mapPortfolioSummaryToViewModel(input.summary)
    : mapPortfolioSummaryToViewModel({
        summary:
          "Third-party consensus data is temporarily unavailable. Your portfolio performance and allocation data remain available.",
        holdingsWithCoverage: 0,
        positiveConsensus: 0,
        mixedConsensus: 0,
        negativeConsensus: 0,
        noAnalystCoverage: 0,
        notApplicable: 0,
        marketOutlook: 0,
        eligibleHoldings: 0,
        providerUnavailable: 0,
        symbolMappingIssues: 0,
        limitedCoverage: 0,
        totalInvestments: investmentCount,
        providerAvailable: false,
        generatedAt: new Date().toISOString(),
      });

  if (!shouldShowUiStatePreview()) {
    return {
      showDevPreviewBanner: false,
      portfolioSummary,
      holdingCards: productionCards,
    };
  }

  return {
    showDevPreviewBanner: true,
    portfolioSummary,
    holdingCards: [
      ...productionCards,
      ...buildMarketConsensusDemoPreviewCards(),
    ],
  };
}

export function formatMarketConsensusWeightLabel(
  weightPercent: number | null,
  currentValueLabel: string | null,
): string {
  if (weightPercent != null && currentValueLabel) {
    return `${formatPortfolioPercent(weightPercent)} · ${currentValueLabel}`;
  }

  if (currentValueLabel) {
    return currentValueLabel;
  }

  if (weightPercent != null) {
    return formatPortfolioPercent(weightPercent);
  }

  return "Weight unavailable";
}
