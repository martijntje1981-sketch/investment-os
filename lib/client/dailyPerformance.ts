import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  resolveHoldingMovePeriod,
  resolvePortfolioMovePeriod,
  type HoldingMovePeriod,
} from "@/lib/client/performancePeriod";
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

  if (holding.assetType === "crypto") {
    return resolveHoldingChangePercent(holding) !== null;
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

  if (holding.assetType === "crypto") {
    if (
      typeof holding.change24hPercent === "number" &&
      Number.isFinite(holding.change24hPercent)
    ) {
      return holding.change24hPercent;
    }
    if (
      typeof holding.changePercent === "number" &&
      Number.isFinite(holding.changePercent)
    ) {
      return holding.changePercent;
    }
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

  if (holding.assetType === "crypto") {
    return marketValue * (changePercent / 100);
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
  const {
    validPerformanceCount,
    eligibleMarketHoldingCount,
    performanceCoverageComplete,
  } = coverage;

  if (eligibleMarketHoldingCount === 0 || performanceCoverageComplete) {
    return null;
  }

  const investmentLabel =
    eligibleMarketHoldingCount === 1 ? "holding" : "holdings";

  return `Based on ${validPerformanceCount} of ${eligibleMarketHoldingCount} ${investmentLabel}.`;
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

    const marketUpdatedAt =
      holding.marketPriceUpdatedAt ??
      holding.priceUpdatedAt ??
      holding.updatedAt ??
      null;
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

export function summarizeDailyMovePeriods(
  performers: DailyPerformer[],
): {
  hasEquity: boolean;
  hasCrypto: boolean;
  isMixed: boolean;
} {
  const portfolioPeriod = resolvePortfolioMovePeriod(
    performers.map((performer) => performer.holding),
  );

  return {
    hasEquity: portfolioPeriod.hasExchangeTraded,
    hasCrypto: portfolioPeriod.hasNativeCrypto,
    isMixed: portfolioPeriod.isMixed,
  };
}

export function resolveDailyMoveHeroLabel(
  periods: ReturnType<typeof summarizeDailyMovePeriods>,
  holdingsForDates: StoredPortfolioHolding[] = [],
): string {
  if (holdingsForDates.length > 0) {
    return resolvePortfolioMovePeriod(holdingsForDates).primaryLabel;
  }

  if (periods.isMixed) {
    return "Latest portfolio move";
  }
  if (periods.hasCrypto && !periods.hasEquity) {
    return "24h";
  }
  if (periods.hasEquity) {
    return "Last session";
  }
  return "Latest available";
}

export function resolveDailyMovePeriodDetail(
  periods: ReturnType<typeof summarizeDailyMovePeriods>,
  holdingsForDates: StoredPortfolioHolding[] = [],
): string | null {
  if (holdingsForDates.length > 0) {
    return resolvePortfolioMovePeriod(holdingsForDates).detail;
  }
  if (periods.isMixed) {
    return "Exchange-traded assets use their latest session; crypto uses 24h.";
  }
  return null;
}

/** Resolve aggregate labels from the holdings that contribute to the move. */
export function resolveDailyMovePeriodFromPerformers(
  performers: DailyPerformer[],
) {
  return resolvePortfolioMovePeriod(performers.map((item) => item.holding));
}

export function pickBestAndWorstMovers(snapshot: DailyPerformanceSnapshot) {
  if (snapshot.performers.length === 0) {
    return { bestMover: null, worstMover: null };
  }

  const bestMover =
    [...snapshot.performers]
      .sort((a, b) => b.move - a.move)
      .find((item) => item.move > 0) ?? null;

  const worstMover =
    [...snapshot.performers]
      .filter((item) => item.move < 0)
      .sort((a, b) => a.move - b.move)[0] ?? null;

  return { bestMover, worstMover };
}

export type HeroMover = {
  holding: StoredPortfolioHolding;
  changePercent: number;
  changeAmount: number;
  changePeriodLabel: string;
  changePeriodAccessibleDescription: string;
};

export function resolveMoverChangePeriodLabel(
  holding: StoredPortfolioHolding,
): string {
  return resolveHoldingMovePeriod(holding).primaryLabel;
}

export function resolveMoverChangePeriodMeta(
  holding: StoredPortfolioHolding,
): HoldingMovePeriod {
  return resolveHoldingMovePeriod(holding);
}

/** Selects top and lowest movers for compact hero display using existing daily performers. */
export function pickTopAndLowestMovers(snapshot: DailyPerformanceSnapshot): {
  topMover: HeroMover | null;
  lowestMover: HeroMover | null;
  hasReliableMoverData: boolean;
} {
  if (snapshot.performers.length === 0) {
    return { topMover: null, lowestMover: null, hasReliableMoverData: false };
  }

  const reliable = snapshot.performers.filter((performer) => {
    const marketValue = getHoldingMarketValue(performer.holding) ?? 0;
    return (
      Number.isFinite(performer.changePercent) &&
      performer.changePercent !== 0 &&
      marketValue > 0
    );
  });

  if (reliable.length === 0) {
    return { topMover: null, lowestMover: null, hasReliableMoverData: false };
  }

  const sorted = [...reliable].sort(
    (left, right) => right.changePercent - left.changePercent,
  );
  const topPerformer = sorted[0]!;
  const lowestPerformer =
    sorted.length > 1 ? sorted[sorted.length - 1]! : null;

  const toHeroMover = (performer: DailyPerformer): HeroMover => {
    const period = resolveHoldingMovePeriod(performer.holding);
    return {
      holding: performer.holding,
      changePercent: performer.changePercent,
      changeAmount: performer.move,
      changePeriodLabel: period.primaryLabel,
      changePeriodAccessibleDescription: period.accessibleDescription,
    };
  };

  return {
    topMover: toHeroMover(topPerformer),
    lowestMover: lowestPerformer ? toHeroMover(lowestPerformer) : null,
    hasReliableMoverData: true,
  };
}
