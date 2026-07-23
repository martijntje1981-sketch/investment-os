/**
 * Portfolio-level analyst aggregation.
 */

import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  averageUpsideForQuotes,
  coveredInvestedValue,
  dataCompletenessPercent,
  enrichAnalystQuoteForHolding,
  findAnalystQuoteForHolding,
  hasAnalystCoverage,
  portfolioInvestedValue,
  weightedAverage,
  weightedConsensusRating,
} from "@/lib/services/analyst/analystCalculations";
import { buildAnalystInsight, buildAnalystObservations } from "@/lib/services/analyst/analystInsights";
import { formatConsensusRating } from "@/lib/services/analyst/normalizeRating";
import {
  ANALYST_DISCLAIMER,
  type AnalystApiQuote,
  type AnalystCoverageState,
  type AnalystRankedHolding,
  type AnalystRecentAction,
  type PortfolioAnalystSnapshot,
} from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type BuildSnapshotInput = {
  holdings: StoredPortfolioHolding[];
  quotes: AnalystApiQuote[];
  recentActions?: AnalystRecentAction[];
  coverageState?: AnalystCoverageState;
};

export function buildPortfolioAnalystSnapshot(
  input: BuildSnapshotInput,
): PortfolioAnalystSnapshot {
  const investments = input.holdings.filter(
    (holding) => holding.assetType !== "cash",
  );
  const investedValue = portfolioInvestedValue(input.holdings);
  const coveredValue = coveredInvestedValue(input.holdings, input.quotes);

  const enriched = investments
    .map((holding) => {
      const quote = findAnalystQuoteForHolding(holding, input.quotes);
      return enrichAnalystQuoteForHolding(holding, quote);
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .filter((item) => hasAnalystCoverage(item));

  const rankedHoldings: AnalystRankedHolding[] = enriched
    .map((item) => {
      const holding = investments.find((entry) => entry.symbol === item.symbol);
      const value =
        holding != null
          ? (holding.currentPrice > 0 ? holding.quantity * holding.currentPrice : 0)
          : 0;

      return {
        symbol: item.symbol,
        name: holding?.name ?? item.symbol,
        consensusRating: item.consensusRating,
        impliedUpsidePercent: item.impliedUpsidePercent,
        portfolioWeightPercent:
          investedValue > 0 ? (value / investedValue) * 100 : 0,
        analystCount: item.analystCount,
      };
    })
    .sort((a, b) => (b.impliedUpsidePercent ?? -999) - (a.impliedUpsidePercent ?? -999));

  const weightedConsensus = weightedConsensusRating(
    enriched.map((item) => {
      const holding = investments.find((entry) => entry.symbol === item.symbol);
      const weight =
        holding != null && holding.currentPrice > 0
          ? holding.quantity * holding.currentPrice
          : 0;
      return { rating: item.consensusRating, weight };
    }),
  );

  const weightedImpliedUpsidePercent = weightedAverage(
    enriched
      .map((item) => {
        const holding = investments.find((entry) => entry.symbol === item.symbol);
        const weight =
          holding != null && holding.currentPrice > 0
            ? holding.quantity * holding.currentPrice
            : 0;
        if (item.impliedUpsidePercent == null || weight <= 0) return null;
        return {
          value: item.impliedUpsidePercent,
          weight,
        };
      })
      .filter((item): item is { value: number; weight: number } => item != null),
  );

  const weightedAveragePriceTarget = weightedAverage(
    enriched
      .map((item) => {
        const holding = investments.find((entry) => entry.symbol === item.symbol);
        const weight =
          holding != null && holding.currentPrice > 0
            ? holding.quantity * holding.currentPrice
            : 0;
        if (item.averagePriceTarget == null || weight <= 0) return null;
        return {
          value: item.averagePriceTarget,
          weight,
        };
      })
      .filter((item): item is { value: number; weight: number } => item != null),
  );

  const totalAnalystRatingsCount = enriched.reduce(
    (sum, item) => sum + item.analystCount,
    0,
  );

  const mostBullish = rankedHoldings[0] ?? null;
  const mostCautious =
    [...rankedHoldings]
      .filter((item) => item.impliedUpsidePercent != null)
      .sort((a, b) => (a.impliedUpsidePercent ?? 0) - (b.impliedUpsidePercent ?? 0))[0] ??
    null;

  const updatedAt =
    input.quotes
      .map((quote) => quote.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const source = input.quotes.find((quote) => quote.source)?.source ?? null;
  const coverageState =
    input.coverageState ??
    (enriched.length > 0
      ? input.quotes.some((quote) => quote.coverageState === "live")
        ? "live"
        : "cached"
      : input.quotes.some((quote) => quote.coverageState === "provider_unavailable")
        ? "provider_unavailable"
        : "no_coverage");

  const base = {
    hasMeaningfulCoverage: enriched.length > 0,
    coverageState,
    coveredHoldingsCount: enriched.length,
    totalInvestmentsCount: investments.length,
    coveragePercentOfInvested:
      investedValue > 0 ? (coveredValue / investedValue) * 100 : 0,
    weightedConsensus,
    weightedImpliedUpsidePercent,
    averageImpliedUpsidePercent: averageUpsideForQuotes(enriched),
    weightedAveragePriceTarget,
    totalAnalystRatingsCount,
    mostBullish,
    mostCautious,
    rankedHoldings,
    recentActions: input.recentActions ?? [],
    dataCompletenessPercent: dataCompletenessPercent(input.quotes),
    source,
    updatedAt,
    disclaimer: ANALYST_DISCLAIMER,
  };

  return {
    ...base,
    observations: buildAnalystObservations(base),
    insight: buildAnalystInsight(base),
  };
}

export function formatUpsideLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPortfolioPercent(value)}`;
}

export function formatAnalystConsensus(
  rating: PortfolioAnalystSnapshot["weightedConsensus"],
): string {
  return formatConsensusRating(rating);
}
