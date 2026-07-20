import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  deriveDailyChangePercentFromPrices,
} from "@/lib/services/prices/marketQuote";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";



export type DailyPerformer = {

  holding: StoredPortfolioHolding;

  changePercent: number;

  move: number;

};



export type DailyPerformanceCoverage = {

  validPerformanceCount: number;

  eligibleMarketHoldingCount: number;

  performanceCoverageComplete: boolean;

};



export type DailyPerformanceSnapshot = DailyPerformanceCoverage & {

  todayChange: number;

  todayPercent: number;

  hasDailyData: boolean;

  performers: DailyPerformer[];

  bestPerformer: DailyPerformer | null;

  worstPerformer: DailyPerformer | null;

  latestMarketUpdateAt: string | null;

};



export function countEligibleMarketHoldings(

  holdings: StoredPortfolioHolding[],

): number {

  return holdings.filter((holding) => holding.assetType !== "cash").length;

}



/** A holding contributes to daily performance only with price and previous close. */
export function hasValidDailyPerformance(
  holding: StoredPortfolioHolding,
): boolean {
  if (holding.assetType === "cash") {
    return false;
  }

  return (
    deriveDailyChangePercentFromPrices(
      holding.currentPrice,
      holding.previousClose,
    ) !== null
  );
}

export function resolveHoldingChangePercent(
  holding: StoredPortfolioHolding,
): number | null {
  if (holding.assetType === "cash") {
    return null;
  }

  return deriveDailyChangePercentFromPrices(
    holding.currentPrice,
    holding.previousClose,
  );
}



export function computeHoldingDayMove(

  holding: StoredPortfolioHolding,

  marketValue = getHoldingMarketValue(holding) ?? 0,

): number {

  const changePercent = resolveHoldingChangePercent(holding);

  if (changePercent === null || marketValue <= 0) {

    return 0;

  }



  return marketValue - marketValue / (1 + changePercent / 100);

}



export function summarizeDailyPerformanceCoverage(

  holdings: StoredPortfolioHolding[],

): DailyPerformanceCoverage {

  const eligibleMarketHoldingCount = countEligibleMarketHoldings(holdings);

  const validPerformanceCount = holdings.filter((holding) =>

    hasValidDailyPerformance(holding),

  ).length;



  return {

    validPerformanceCount,

    eligibleMarketHoldingCount,

    performanceCoverageComplete:

      eligibleMarketHoldingCount === 0 ||

      validPerformanceCount === eligibleMarketHoldingCount,

  };

}



export function formatDailyPerformanceCoverageMessage(

  coverage: DailyPerformanceCoverage,

): string | null {

  const { validPerformanceCount, eligibleMarketHoldingCount, performanceCoverageComplete } =

    coverage;



  if (eligibleMarketHoldingCount === 0 || performanceCoverageComplete) {

    return null;

  }



  const investmentLabel =

    eligibleMarketHoldingCount === 1 ? "investment" : "investments";



  return `Daily performance currently available for ${validPerformanceCount} of ${eligibleMarketHoldingCount} ${investmentLabel}.`;

}



export function summarizeDailyPerformance(

  holdings: StoredPortfolioHolding[],

): DailyPerformanceSnapshot {

  let todayChange = 0;

  let latestMarketUpdateAt: string | null = null;

  const performers: DailyPerformer[] = [];

  const coverage = summarizeDailyPerformanceCoverage(holdings);



  for (const holding of holdings) {

    if (holding.assetType === "cash") {

      continue;

    }



    const changePercent = resolveHoldingChangePercent(holding);

    const value = getHoldingMarketValue(holding) ?? 0;

    const move = computeHoldingDayMove(holding, value);



    if (changePercent !== null && value > 0) {

      todayChange += move;

      performers.push({ holding, changePercent, move });

    }



    const marketUpdatedAt = holding.marketPriceUpdatedAt ?? holding.updatedAt ?? null;

    if (marketUpdatedAt) {

      if (

        !latestMarketUpdateAt ||

        Date.parse(marketUpdatedAt) > Date.parse(latestMarketUpdateAt)

      ) {

        latestMarketUpdateAt = marketUpdatedAt;

      }

    }

  }



  const sortedByChange = [...performers].sort(

    (a, b) => b.changePercent - a.changePercent,

  );



  const previousValue = performers.reduce((sum, item) => {

    const value = getHoldingMarketValue(item.holding) ?? 0;

    return sum + (value - item.move);

  }, 0);



  const todayPercent =

    previousValue > 0 ? (todayChange / previousValue) * 100 : 0;



  return {

    ...coverage,

    todayChange,

    todayPercent,

    hasDailyData: performers.length > 0,

    performers,

    bestPerformer: sortedByChange[0] ?? null,

    worstPerformer: sortedByChange[sortedByChange.length - 1] ?? null,

    latestMarketUpdateAt,

  };

}



export function pickBestAndWorstMovers(snapshot: DailyPerformanceSnapshot) {

  if (!snapshot.performanceCoverageComplete) {

    return { bestMover: null, worstMover: null };

  }



  const bestMover =

    [...snapshot.performers].sort((a, b) => b.move - a.move).find((item) => item.move > 0) ??

    null;

  const worstMover =

    [...snapshot.performers]

      .filter((item) => item.move < 0)

      .sort((a, b) => a.move - b.move)[0] ?? null;



  return { bestMover, worstMover };

}


