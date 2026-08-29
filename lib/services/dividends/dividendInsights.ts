/**
 * Deterministic dividend observations and dashboard insight copy.
 */

import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

type DividendObservationInput = Pick<
  PortfolioDividendSnapshot,
  | "estimatedAnnualIncomeEur"
  | "payingHoldingsCount"
  | "portfolioYieldPercent"
  | "concentrationSharePercent"
  | "incomeDiversificationLabel"
  | "largestContributor"
  | "highestYield"
>;

export function buildDividendObservations(
  input: DividendObservationInput,
): string[] {
  const observations: string[] = [];

  if (input.estimatedAnnualIncomeEur <= 0) {
    observations.push(
      "This portfolio appears focused primarily on capital appreciation rather than dividend income.",
    );
    return observations;
  }

  observations.push(
    `Estimated annual dividend income is ${formatPortfolioCurrency(input.estimatedAnnualIncomeEur)} across ${input.payingHoldingsCount} paying ${input.payingHoldingsCount === 1 ? "holding" : "holdings"}.`,
  );

  if (input.portfolioYieldPercent > 0) {
    observations.push(
      `Portfolio dividend yield is ${formatPortfolioPercent(input.portfolioYieldPercent)} based on estimated annual income and current portfolio value.`,
    );
  }

  if (input.concentrationSharePercent >= 50 && input.largestContributor) {
    observations.push(
      `More than half of your dividend income comes from ${input.largestContributor.symbol}.`,
    );
  } else if (input.incomeDiversificationLabel === "well_diversified") {
    observations.push("Dividend income is well diversified across your holdings.");
  } else if (input.incomeDiversificationLabel === "moderate") {
    observations.push(
      "Dividend income is moderately concentrated across your top contributors.",
    );
  }

  if (input.highestYield && input.highestYield.yieldPercent >= 6) {
    observations.push(
      `${input.highestYield.symbol} has the highest dividend yield at ${formatPortfolioPercent(input.highestYield.yieldPercent)}.`,
    );
  }

  return observations;
}

export function buildDividendInsight(
  input: DividendObservationInput,
): string {
  if (input.estimatedAnnualIncomeEur <= 0) {
    return "No meaningful dividend income is visible for your current holdings.";
  }

  const income = formatPortfolioCurrency(input.estimatedAnnualIncomeEur);

  if (input.concentrationSharePercent >= 58 && input.largestContributor) {
    return `${Math.round(input.concentrationSharePercent)}% of your dividend income comes from ${input.largestContributor.symbol}. Consider how concentrated that passive income stream is.`;
  }

  if (input.incomeDiversificationLabel === "well_diversified") {
    return `Your portfolio is expected to generate approximately ${income} annually in dividends, with income spread across multiple holdings.`;
  }

  return `Your portfolio is expected to generate approximately ${income} annually in dividends.`;
}
