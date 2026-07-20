/**
 * Portfolio-level dividend calculations from holding quotes.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type {
  DividendAllocationItem,
  DividendApiQuote,
  DividendNextPayment,
  PortfolioDividendSnapshot,
} from "@/lib/types/dividends";
import { buildDividendInsight, buildDividendObservations } from "@/lib/services/dividends/dividendInsights";

function quoteLookupKeys(quote: DividendApiQuote): string[] {
  return [
    quote.symbol.trim().toUpperCase(),
    quote.providerSymbol.trim().toUpperCase(),
  ];
}

export function scaleDividendQuoteForQuantity(
  quote: DividendApiQuote,
  quantity: number,
): DividendApiQuote {
  if (quantity <= 0 || quantity === 1) return quote;

  return {
    ...quote,
    estimatedAnnualDividendEur:
      quote.estimatedAnnualDividendEur != null
        ? quote.estimatedAnnualDividendEur * quantity
        : null,
    estimatedNextPaymentEur:
      quote.estimatedNextPaymentEur != null
        ? quote.estimatedNextPaymentEur * quantity
        : null,
  };
}

export function findDividendQuoteForHolding(
  holding: StoredPortfolioHolding,
  quotes: DividendApiQuote[],
): DividendApiQuote | null {
  const keys = new Set<string>();
  keys.add(holding.symbol.trim().toUpperCase());
  if (holding.providerSymbol) {
    keys.add(holding.providerSymbol.trim().toUpperCase());
  }

  const base =
    quotes.find((quote) =>
      quoteLookupKeys(quote).some((key) => keys.has(key)),
    ) ?? null;

  if (!base) return null;
  return scaleDividendQuoteForQuantity(base, holding.quantity);
}

function incomeDiversificationLabel(
  concentrationSharePercent: number,
): PortfolioDividendSnapshot["incomeDiversificationLabel"] {
  if (concentrationSharePercent >= 55) return "concentrated";
  if (concentrationSharePercent >= 35) return "moderate";
  return "well_diversified";
}

export function buildPortfolioDividendSnapshot(
  holdings: StoredPortfolioHolding[],
  quotes: DividendApiQuote[],
): PortfolioDividendSnapshot {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + (getHoldingMarketValue(holding) ?? 0),
    0,
  );

  const matched = investments
    .map((holding) => ({
      holding,
      quote: findDividendQuoteForHolding(holding, quotes),
    }))
    .filter(({ quote }) => quote?.paysDividends && (quote.estimatedAnnualDividendEur ?? 0) > 0);

  const estimatedAnnualIncomeEur = matched.reduce(
    (sum, { quote }) => sum + (quote?.estimatedAnnualDividendEur ?? 0),
    0,
  );

  const allocation: DividendAllocationItem[] = matched
    .map(({ holding, quote }) => ({
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      incomeEur: quote?.estimatedAnnualDividendEur ?? 0,
      sharePercent:
        estimatedAnnualIncomeEur > 0
          ? ((quote?.estimatedAnnualDividendEur ?? 0) / estimatedAnnualIncomeEur) * 100
          : 0,
    }))
    .sort((a, b) => b.incomeEur - a.incomeEur);

  const yields = matched
    .map(({ holding, quote }) => ({
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      yieldPercent: quote?.dividendYield ?? 0,
    }))
    .filter((item) => item.yieldPercent > 0)
    .sort((a, b) => b.yieldPercent - a.yieldPercent);

  const largestContributor = allocation[0] ?? null;
  const concentrationSharePercent = largestContributor?.sharePercent ?? 0;

  const averageYieldPercent =
    yields.length > 0
      ? yields.reduce((sum, item) => sum + item.yieldPercent, 0) / yields.length
      : 0;

  const nextCandidates: DividendNextPayment[] = matched
    .flatMap(({ holding, quote }) => {
      if (!quote?.nextPaymentDate || !quote.estimatedNextPaymentEur) return [];
      return [
        {
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          paymentDate: quote.nextPaymentDate,
          amountEur: quote.estimatedNextPaymentEur,
        },
      ];
    })
    .sort(
      (a, b) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
    );

  const updatedAt = quotes
    .map((quote) => quote.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const snapshotBase = {
    hasDividendData: estimatedAnnualIncomeEur > 0,
    estimatedAnnualIncomeEur,
    portfolioYieldPercent:
      portfolioValue > 0 ? (estimatedAnnualIncomeEur / portfolioValue) * 100 : 0,
    payingHoldingsCount: matched.length,
    averageYieldPercent,
    highestYield: yields[0] ?? null,
    largestContributor,
    concentrationSharePercent,
    incomeDiversificationLabel: incomeDiversificationLabel(concentrationSharePercent),
    allocation,
    nextPayment: nextCandidates[0] ?? null,
    updatedAt,
  };

  const observations = buildDividendObservations(snapshotBase);
  const insight = buildDividendInsight(snapshotBase);

  return {
    ...snapshotBase,
    observations,
    insight,
  };
}

export function computePassiveIncomeProgress(
  annualIncomeEur: number,
  passiveIncomeTargetEur: number | null | undefined,
): number {
  if (
    passiveIncomeTargetEur == null ||
    !Number.isFinite(passiveIncomeTargetEur) ||
    passiveIncomeTargetEur <= 0
  ) {
    return 0;
  }
  return Math.min((annualIncomeEur / passiveIncomeTargetEur) * 100, 100);
}
