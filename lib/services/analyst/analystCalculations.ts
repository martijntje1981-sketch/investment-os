/**
 * Analyst upside/downside and portfolio aggregation calculations.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  consensusFromCounts,
  ratingToScore,
  scoreToRating,
  totalAnalystCount,
} from "@/lib/services/analyst/normalizeRating";
import type {
  AnalystApiQuote,
  AnalystHoldingMetrics,
  AnalystRatingCounts,
  NormalizedAnalystRating,
} from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function convertAnalystTargetToEur(
  amount: number | null,
  currency: string | null,
  fxRateToEur: number | null,
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const normalized = currency?.trim().toUpperCase();
  if (!normalized || normalized === "EUR") return amount;
  if (fxRateToEur == null || !Number.isFinite(fxRateToEur) || fxRateToEur <= 0) {
    return null;
  }
  return amount * fxRateToEur;
}

export function calculateImpliedUpsidePercent(
  currentPrice: number | null | undefined,
  targetPrice: number | null | undefined,
): number | null {
  if (
    currentPrice == null ||
    targetPrice == null ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(targetPrice) ||
    currentPrice <= 0 ||
    targetPrice <= 0
  ) {
    return null;
  }

  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

export function hasAnalystCoverage(quote: AnalystApiQuote): boolean {
  return (
    quote.coverageState !== "no_coverage" &&
    quote.coverageState !== "provider_unavailable" &&
    quote.consensusRating !== "No Coverage" &&
    quote.analystCount > 0
  );
}

function quoteLookupKeys(quote: AnalystApiQuote): string[] {
  return [
    quote.symbol.trim().toUpperCase(),
    quote.providerSymbol.trim().toUpperCase(),
  ];
}

export function findAnalystQuoteForHolding(
  holding: StoredPortfolioHolding,
  quotes: AnalystApiQuote[],
): AnalystApiQuote | null {
  const keys = new Set<string>();
  keys.add(holding.symbol.trim().toUpperCase());
  if (holding.providerSymbol) {
    keys.add(holding.providerSymbol.trim().toUpperCase());
  }

  return (
    quotes.find((quote) =>
      quoteLookupKeys(quote).some((key) => keys.has(key)),
    ) ?? null
  );
}

export function enrichAnalystQuoteForHolding(
  holding: StoredPortfolioHolding,
  quote: AnalystApiQuote | null,
): AnalystHoldingMetrics | null {
  if (!quote) return null;

  const currentPriceEur =
    holding.assetType === "cash" ||
    !Number.isFinite(holding.currentPrice) ||
    holding.currentPrice <= 0
      ? null
      : holding.currentPrice;

  return {
    ...quote,
    currentPriceEur,
    impliedUpsidePercent: calculateImpliedUpsidePercent(
      currentPriceEur,
      quote.averagePriceTarget,
    ),
  };
}

export function weightedConsensusRating(
  items: Array<{
    rating: NormalizedAnalystRating;
    weight: number;
  }>,
): NormalizedAnalystRating {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const item of items) {
    const score = ratingToScore(item.rating);
    if (score <= 0 || item.weight <= 0) continue;
    weightedScore += score * item.weight;
    totalWeight += item.weight;
  }

  if (totalWeight <= 0) return "No Coverage";
  return scoreToRating(weightedScore / totalWeight);
}

export function weightedAverage(
  items: Array<{ value: number; weight: number }>,
): number | null {
  let total = 0;
  let weightSum = 0;

  for (const item of items) {
    if (!Number.isFinite(item.value) || item.weight <= 0) continue;
    total += item.value * item.weight;
    weightSum += item.weight;
  }

  if (weightSum <= 0) return null;
  return total / weightSum;
}

export function mergeRatingCounts(
  counts: AnalystRatingCounts[],
): AnalystRatingCounts {
  return counts.reduce(
    (merged, current) => ({
      strongBuy: merged.strongBuy + current.strongBuy,
      buy: merged.buy + current.buy,
      hold: merged.hold + current.hold,
      sell: merged.sell + current.sell,
      strongSell: merged.strongSell + current.strongSell,
    }),
    { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 },
  );
}

export function portfolioInvestedValue(
  holdings: StoredPortfolioHolding[],
): number {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .reduce((sum, holding) => sum + (getHoldingMarketValue(holding) ?? 0), 0);
}

export function coveredInvestedValue(
  holdings: StoredPortfolioHolding[],
  quotes: AnalystApiQuote[],
): number {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .reduce((sum, holding) => {
      const quote = findAnalystQuoteForHolding(holding, quotes);
      if (!quote || !hasAnalystCoverage(quote)) return sum;
      return sum + (getHoldingMarketValue(holding) ?? 0);
    }, 0);
}

export function averageUpsideForQuotes(
  metrics: AnalystHoldingMetrics[],
): number | null {
  const values = metrics
    .map((item) => item.impliedUpsidePercent)
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function dataCompletenessPercent(
  quotes: AnalystApiQuote[],
): number {
  if (quotes.length === 0) return 0;
  const complete = quotes.filter((quote) => quote.dataConfidence === "complete").length;
  return (complete / quotes.length) * 100;
}

export function aggregateCountsConsensus(
  counts: AnalystRatingCounts,
): NormalizedAnalystRating {
  return consensusFromCounts(counts);
}

export function sumAnalystCounts(counts: AnalystRatingCounts): number {
  return totalAnalystCount(counts);
}
