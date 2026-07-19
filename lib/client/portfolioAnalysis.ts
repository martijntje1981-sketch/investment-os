import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type AnalysisHolding = StoredPortfolioHolding;

export type ValuedPosition = {
  holding: AnalysisHolding;
  value: number;
  weightPercent: number;
};

export type PortfolioAnalysisSnapshot = {
  valuedPositions: ValuedPosition[];
  unvaluedHoldings: AnalysisHolding[];
  totalValue: number;
  investmentCount: number;
  cashCurrencyCount: number;
  cashWeightPercent: number;
  largestPosition: ValuedPosition | null;
  topThreeWeightPercent: number;
  hhi: number;
  concentrationLevel: ConcentrationLevel;
  investmentWeightPercent: number;
  cashByCurrency: Array<{ currency: string; value: number; weightPercent: number }>;
  assetTypeBreakdown: Array<{ label: string; value: number; weightPercent: number }>;
  observations: string[];
  lastUpdatedAt: string | null;
};

export type ConcentrationLevel =
  | "broadly_spread"
  | "moderately_concentrated"
  | "highly_concentrated";

/** HHI thresholds on a 0–1 scale (sum of squared portfolio weights). */
export const CONCENTRATION_HHI_BROAD_MAX = 0.15;
export const CONCENTRATION_HHI_MODERATE_MAX = 0.25;

export const OBSERVATION_LARGEST_WEIGHT_THRESHOLD = 40;
export const OBSERVATION_TOP3_WEIGHT_THRESHOLD = 70;
export const OBSERVATION_HIGH_CASH_THRESHOLD = 30;
export const OBSERVATION_LOW_CASH_THRESHOLD = 5;
export const OBSERVATION_SMALL_HOLDINGS_COUNT = 3;

export function getHoldingMarketValue(holding: AnalysisHolding): number | null {
  if (!Number.isFinite(holding.quantity) || holding.quantity < 0) {
    return null;
  }

  if (holding.assetType === "cash") {
    const price = Number.isFinite(holding.currentPrice) && holding.currentPrice > 0
      ? holding.currentPrice
      : 1;
    return holding.quantity * price;
  }

  if (!Number.isFinite(holding.currentPrice) || holding.currentPrice <= 0) {
    return null;
  }

  return holding.quantity * holding.currentPrice;
}

export function buildValuedPositions(holdings: AnalysisHolding[]): {
  valuedPositions: ValuedPosition[];
  unvaluedHoldings: AnalysisHolding[];
  totalValue: number;
} {
  const unvaluedHoldings: AnalysisHolding[] = [];
  const valued: Array<{ holding: AnalysisHolding; value: number }> = [];

  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding);

    if (value === null || value <= 0) {
      if (holding.assetType !== "cash" || holding.quantity > 0) {
        unvaluedHoldings.push(holding);
      }
      continue;
    }

    valued.push({ holding, value });
  }

  const totalValue = valued.reduce((sum, item) => sum + item.value, 0);

  const valuedPositions = valued
    .map(({ holding, value }) => ({
      holding,
      value,
      weightPercent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return { valuedPositions, unvaluedHoldings, totalValue };
}

export function calculateHerfindahlIndex(weightPercents: number[]): number {
  return weightPercents.reduce((sum, weight) => {
    const fraction = weight / 100;
    return sum + fraction * fraction;
  }, 0);
}

export function classifyConcentration(hhi: number): ConcentrationLevel {
  if (hhi < CONCENTRATION_HHI_BROAD_MAX) {
    return "broadly_spread";
  }

  if (hhi <= CONCENTRATION_HHI_MODERATE_MAX) {
    return "moderately_concentrated";
  }

  return "highly_concentrated";
}

export function concentrationLabel(level: ConcentrationLevel): string {
  switch (level) {
    case "broadly_spread":
      return "Broadly spread";
    case "moderately_concentrated":
      return "Moderately concentrated";
    case "highly_concentrated":
      return "Highly concentrated";
  }
}

export function concentrationExplanation(level: ConcentrationLevel): string {
  switch (level) {
    case "broadly_spread":
      return `No single position dominates and combined weights stay below the moderate threshold (HHI below ${CONCENTRATION_HHI_BROAD_MAX}).`;
    case "moderately_concentrated":
      return `A smaller set of positions contributes a meaningful share of total value (HHI between ${CONCENTRATION_HHI_BROAD_MAX} and ${CONCENTRATION_HHI_MODERATE_MAX}).`;
    case "highly_concentrated":
      return `Portfolio value is concentrated in a few positions (HHI above ${CONCENTRATION_HHI_MODERATE_MAX}).`;
  }
}

export function getPortfolioLastUpdated(holdings: AnalysisHolding[]): string | null {
  const timestamps = holdings
    .map((holding) => holding.updatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export function formatPortfolioCurrency(
  value: number,
  currency: string = "EUR",
  decimals = 0,
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPortfolioPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function buildPortfolioAnalysis(
  holdings: AnalysisHolding[],
): PortfolioAnalysisSnapshot {
  const { valuedPositions, unvaluedHoldings, totalValue } =
    buildValuedPositions(holdings);

  const investmentHoldings = holdings.filter(
    (holding) => holding.assetType !== "cash",
  );

  const cashValue = valuedPositions
    .filter((position) => position.holding.assetType === "cash")
    .reduce((sum, position) => sum + position.value, 0);

  const investmentValue = totalValue - cashValue;
  const weights = valuedPositions.map((position) => position.weightPercent);
  const hhi = calculateHerfindahlIndex(weights);
  const concentrationLevel = classifyConcentration(hhi);
  const largestPosition = valuedPositions[0] ?? null;
  const topThreeWeightPercent = valuedPositions
    .slice(0, 3)
    .reduce((sum, position) => sum + position.weightPercent, 0);

  const cashByCurrencyMap = new Map<string, number>();
  for (const position of valuedPositions) {
    if (position.holding.assetType !== "cash") continue;
    const currency = position.holding.currency || position.holding.symbol || "EUR";
    cashByCurrencyMap.set(
      currency,
      (cashByCurrencyMap.get(currency) ?? 0) + position.value,
    );
  }

  const cashByCurrency = [...cashByCurrencyMap.entries()]
    .map(([currency, value]) => ({
      currency,
      value,
      weightPercent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const assetTypeBreakdown = [
    {
      label: "Investments",
      value: investmentValue,
      weightPercent: totalValue > 0 ? (investmentValue / totalValue) * 100 : 0,
    },
    {
      label: "Cash",
      value: cashValue,
      weightPercent: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  const currencies = new Set(
    holdings
      .map((holding) => holding.currency || "EUR")
      .filter(Boolean),
  );

  const observations = buildObservations({
    totalValue,
    valuedPositions,
    unvaluedHoldings,
    investmentCount: investmentHoldings.length,
    cashWeightPercent: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
    largestPosition,
    topThreeWeightPercent,
    currencyCount: currencies.size,
  });

  return {
    valuedPositions,
    unvaluedHoldings,
    totalValue,
    investmentCount: investmentHoldings.length,
    cashCurrencyCount: cashByCurrency.length,
    cashWeightPercent: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
    investmentWeightPercent:
      totalValue > 0 ? (investmentValue / totalValue) * 100 : 0,
    largestPosition,
    topThreeWeightPercent,
    hhi,
    concentrationLevel,
    cashByCurrency,
    assetTypeBreakdown,
    observations,
    lastUpdatedAt: getPortfolioLastUpdated(holdings),
  };
}

function buildObservations(input: {
  totalValue: number;
  valuedPositions: ValuedPosition[];
  unvaluedHoldings: AnalysisHolding[];
  investmentCount: number;
  cashWeightPercent: number;
  largestPosition: ValuedPosition | null;
  topThreeWeightPercent: number;
  currencyCount: number;
}): string[] {
  const observations: string[] = [];

  if (input.totalValue <= 0) {
    return observations;
  }

  if (input.largestPosition) {
    const { holding, weightPercent } = input.largestPosition;
    const label = holding.assetType === "cash" ? holding.name : holding.symbol;

    if (weightPercent >= OBSERVATION_LARGEST_WEIGHT_THRESHOLD) {
      observations.push(
        `${label} represents ${formatPortfolioPercent(weightPercent)} of the valued portfolio.`,
      );
    }
  }

  if (input.topThreeWeightPercent >= OBSERVATION_TOP3_WEIGHT_THRESHOLD) {
    observations.push(
      `Your top three valued positions account for ${formatPortfolioPercent(input.topThreeWeightPercent)} of the portfolio.`,
    );
  }

  if (input.cashWeightPercent >= OBSERVATION_HIGH_CASH_THRESHOLD) {
    observations.push(
      `Cash makes up ${formatPortfolioPercent(input.cashWeightPercent)} of total portfolio value.`,
    );
  } else if (
    input.cashWeightPercent > 0 &&
    input.cashWeightPercent <= OBSERVATION_LOW_CASH_THRESHOLD
  ) {
    observations.push(
      `Cash is a small part of the portfolio at ${formatPortfolioPercent(input.cashWeightPercent)}.`,
    );
  }

  if (input.investmentCount > 0 && input.investmentCount <= OBSERVATION_SMALL_HOLDINGS_COUNT) {
    observations.push(
      `The portfolio contains ${input.investmentCount} investment ${input.investmentCount === 1 ? "holding" : "holdings"}.`,
    );
  }

  if (input.currencyCount > 1) {
    observations.push(
      `Holdings span ${input.currencyCount} currencies based on stored currency labels.`,
    );
  }

  if (input.unvaluedHoldings.length > 0) {
    observations.push(
      `${input.unvaluedHoldings.length} ${input.unvaluedHoldings.length === 1 ? "holding lacks" : "holdings lack"} a usable current price and ${input.unvaluedHoldings.length === 1 ? "is" : "are"} excluded from valued totals.`,
    );
  }

  return observations;
}
