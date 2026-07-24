/**
 * Portfolio performance calculations for the Analysis page.
 *
 * Method: contribution_adjusted_simple_return
 * --------------------------------------------
 * investmentReturn = endingValue - startingValue - netContributions
 *
 * Time-weighted return (TWR) is not used because the app does not yet expose
 * a reliable, timestamped cash-flow ledger to the client. When net contributions
 * are unknown, they remain null rather than assumed zero for multi-day periods.
 *
 * Data sources (no provider calls here):
 * - Current holding prices and previous close from StoredPortfolioHolding / PriceService refresh
 * - Cost basis from quantity × purchasePrice
 */

import {
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import {
  computeHoldingDayMove,
  resolveHoldingChangePercent,
  summarizeDailyPerformance,
} from "@/lib/client/dailyPerformance";
import {
  buildPortfolioPerformance,
} from "@/lib/client/portfolioPerformance";
import { resolvePeriodBounds } from "@/lib/client/performance/periodBounds";
import type {
  PerformanceCalculationMethod,
  PerformanceDataAvailability,
  PerformanceHoldingLeader,
  PerformancePeriodId,
  PortfolioPerformancePoint,
  PortfolioPerformanceResult,
} from "@/lib/client/performance/types";
import { PERFORMANCE_PERIODS } from "@/lib/client/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const METHOD: PerformanceCalculationMethod = "contribution_adjusted_simple_return";

function periodLabel(period: PerformancePeriodId): string {
  return PERFORMANCE_PERIODS.find((item) => item.id === period)?.label ?? period;
}

function resolveLatestUpdateAt(holdings: StoredPortfolioHolding[]): string | null {
  let latest: string | null = null;

  for (const holding of holdings) {
    const candidate = holding.marketPriceUpdatedAt ?? holding.updatedAt ?? null;
    if (!candidate) continue;

    if (!latest || Date.parse(candidate) > Date.parse(latest)) {
      latest = candidate;
    }
  }

  return latest;
}

function sumCurrentPortfolioValue(holdings: StoredPortfolioHolding[]): number {
  return holdings.reduce((sum, holding) => {
    const value = getHoldingMarketValue(holding);
    return value !== null && value > 0 ? sum + value : sum;
  }, 0);
}

/** Live market-priced investments participate in 1D performance; purchase-only estimates do not. */
function requiresDailyPreviousClose(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType === "cash") {
    return false;
  }

  return Number.isFinite(holding.currentPrice) && holding.currentPrice > 0;
}

type DailyPerformanceScope = {
  startingValue: number;
  endingValue: number;
  eligibleCount: number;
  coveredCount: number;
  coverageComplete: boolean;
};

/**
 * Builds 1D start/end totals from cash plus live-priced investments only.
 * Cash is flat (no previous close required). Purchase-cost-only holdings are excluded.
 */
function sumScopedDailyPerformanceValues(
  holdings: StoredPortfolioHolding[],
): DailyPerformanceScope {
  let startingValue = 0;
  let endingValue = 0;
  let eligibleCount = 0;
  let coveredCount = 0;

  for (const holding of holdings) {
    if (holding.assetType === "cash") {
      const cashValue = getHoldingMarketValue(holding);
      if (cashValue !== null && cashValue > 0) {
        startingValue += cashValue;
        endingValue += cashValue;
      }
      continue;
    }

    if (!requiresDailyPreviousClose(holding)) {
      continue;
    }

    const currentValue = getHoldingMarketValue(holding);
    if (currentValue === null || currentValue <= 0) {
      continue;
    }

    eligibleCount += 1;
    endingValue += currentValue;

    const changePercent = resolveHoldingChangePercent(holding);
    if (changePercent === null) {
      continue;
    }

    const previousValue = currentValue - computeHoldingDayMove(holding, currentValue);
    if (previousValue > 0) {
      startingValue += previousValue;
      coveredCount += 1;
    }
  }

  const coverageComplete =
    eligibleCount === 0 || coveredCount === eligibleCount;

  return {
    startingValue,
    endingValue,
    eligibleCount,
    coveredCount,
    coverageComplete,
  };
}

function computeContributionAdjustedReturn(
  startingValue: number | null,
  endingValue: number | null,
  netContributions: number | null,
): { investmentReturn: number | null; investmentReturnPercent: number | null } {
  if (startingValue === null || endingValue === null) {
    return { investmentReturn: null, investmentReturnPercent: null };
  }

  const flows = netContributions ?? 0;
  const investmentReturn = endingValue - startingValue - flows;
  const investmentReturnPercent =
    startingValue > 0 ? (investmentReturn / startingValue) * 100 : null;

  return { investmentReturn, investmentReturnPercent };
}

function buildDailyPerformance(
  holdings: StoredPortfolioHolding[],
  asOf: Date,
): PortfolioPerformanceResult {
  const daily = summarizeDailyPerformance(holdings);
  const endingValue = sumCurrentPortfolioValue(holdings);
  const scoped = sumScopedDailyPerformanceValues(holdings);
  const bounds = resolvePeriodBounds("1D", asOf);

  const chartStartingValue =
    scoped.coverageComplete && scoped.startingValue > 0
      ? scoped.startingValue
      : null;
  const chartEndingValue =
    scoped.coverageComplete && scoped.endingValue > 0
      ? scoped.endingValue
      : null;
  const netContributions = 0;
  const { investmentReturn, investmentReturnPercent } =
    computeContributionAdjustedReturn(
      chartStartingValue,
      chartEndingValue,
      netContributions,
    );

  const chartPoints: PortfolioPerformancePoint[] = [];
  if (chartStartingValue !== null && chartEndingValue !== null) {
    chartPoints.push({
      date: bounds.startDate.toISOString(),
      portfolioValue: chartStartingValue,
      netContributions: 0,
      investmentReturn: 0,
    });
    chartPoints.push({
      date: bounds.endDate.toISOString(),
      portfolioValue: chartEndingValue,
      netContributions: 0,
      investmentReturn,
    });
  }

  let dataAvailability: PerformanceDataAvailability = "unavailable";
  let availabilityMessage: string | null =
    "Daily performance requires previous-close data.";

  if (scoped.coverageComplete && chartPoints.length >= 2) {
    dataAvailability = "full";
    availabilityMessage = null;
  } else if (scoped.eligibleCount > 0 && !scoped.coverageComplete) {
    dataAvailability = "partial";
    availabilityMessage = "Daily performance requires previous-close data.";
  } else if (endingValue > 0) {
    dataAvailability = "partial";
    availabilityMessage =
      scoped.eligibleCount === 0
        ? "Only cash is held — daily investment performance does not apply."
        : "Investment return is not available yet.";
  }

  const performers = daily.performers.filter((item) => item.changePercent !== null);
  const bestHolding = mapDailyPerformer(performers[0] ?? null);
  const worstHolding = mapDailyPerformer(
    performers.length > 0 ? performers[performers.length - 1] : null,
  );

  return {
    period: "1D",
    periodLabel: periodLabel("1D"),
    calculationMethod: METHOD,
    dataAvailability,
    availabilityMessage,
    currentPortfolioValue: endingValue,
    startingPortfolioValue: chartStartingValue,
    endingPortfolioValue: chartEndingValue ?? endingValue,
    netContributions,
    investmentReturn,
    investmentReturnPercent,
    lastUpdatedAt: daily.latestMarketUpdateAt ?? resolveLatestUpdateAt(holdings),
    chartPoints,
    chartHasSeries: chartPoints.length >= 2,
    bestHolding,
    worstHolding,
    holdingLeadersAvailable:
      scoped.coverageComplete && performers.length > 0,
  };
}

function mapDailyPerformer(
  performer: {
    holding: StoredPortfolioHolding;
    changePercent: number;
    move: number;
  } | null,
): PerformanceHoldingLeader | null {
  if (!performer) return null;

  return {
    holdingId: performer.holding.id,
    symbol: performer.holding.symbol,
    name: performer.holding.name || performer.holding.symbol,
    returnPercent: performer.changePercent,
    returnAmount: performer.move,
    periodContributionEur: performer.move,
    dataComplete: true,
  };
}

function buildSinceInceptionSummary(
  holdings: StoredPortfolioHolding[],
  asOf: Date,
): PortfolioPerformanceResult {
  const performance = buildPortfolioPerformance(holdings);
  const endingValue = performance.totalValue;
  const startingValue =
    performance.canShowPerformance && performance.investedCapital > 0
      ? performance.investedCapital
      : null;
  const netContributions = null;
  const { investmentReturn, investmentReturnPercent } =
    computeContributionAdjustedReturn(
      startingValue,
      endingValue,
      netContributions,
    );

  const bounds = resolvePeriodBounds("ALL", asOf);
  const chartPoints: PortfolioPerformancePoint[] = [];

  if (startingValue !== null && endingValue > 0) {
    chartPoints.push({
      date: bounds.startDate.toISOString(),
      portfolioValue: startingValue,
      netContributions: null,
      investmentReturn: 0,
    });
    chartPoints.push({
      date: bounds.endDate.toISOString(),
      portfolioValue: endingValue,
      netContributions: null,
      investmentReturn,
    });
  }

  let dataAvailability: PerformanceDataAvailability = "unavailable";
  let availabilityMessage: string | null =
    "Investment return is not available yet.";

  if (performance.canShowPerformance) {
    dataAvailability = "summary_only";
    availabilityMessage = null;
  } else if (performance.hasUnvaluedInvestments) {
    dataAvailability = "partial";
    availabilityMessage = "Investment return is not available yet.";
  }

  const leaders = buildSinceInceptionHoldingLeaders(holdings);

  return {
    period: "ALL",
    periodLabel: periodLabel("ALL"),
    calculationMethod: METHOD,
    dataAvailability,
    availabilityMessage,
    currentPortfolioValue: endingValue,
    startingPortfolioValue: startingValue,
    endingPortfolioValue: endingValue,
    netContributions,
    investmentReturn:
      performance.canShowPerformance ? investmentReturn : null,
    investmentReturnPercent:
      performance.canShowPerformance ? investmentReturnPercent : null,
    lastUpdatedAt: resolveLatestUpdateAt(holdings),
    chartPoints,
    chartHasSeries: false,
    bestHolding: leaders.best,
    worstHolding: leaders.worst,
    holdingLeadersAvailable: leaders.available,
  };
}

function buildSinceInceptionHoldingLeaders(holdings: StoredPortfolioHolding[]): {
  best: PerformanceHoldingLeader | null;
  worst: PerformanceHoldingLeader | null;
  available: boolean;
} {
  const rows: PerformanceHoldingLeader[] = [];

  for (const holding of holdings) {
    if (holding.assetType === "cash") continue;

    const currentValue = getHoldingMarketValue(holding);
    if (
      currentValue === null ||
      !Number.isFinite(holding.quantity) ||
      !Number.isFinite(holding.purchasePrice) ||
      holding.purchasePrice <= 0
    ) {
      continue;
    }

    const costBasis = holding.quantity * holding.purchasePrice;
    if (costBasis <= 0) continue;

    const returnAmount = currentValue - costBasis;
    const returnPercent = (returnAmount / costBasis) * 100;

    rows.push({
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      returnPercent,
      returnAmount,
      periodContributionEur: returnAmount,
      dataComplete: true,
    });
  }

  if (rows.length === 0) {
    return { best: null, worst: null, available: false };
  }

  const sorted = [...rows].sort(
    (a, b) => (b.returnPercent ?? 0) - (a.returnPercent ?? 0),
  );

  return {
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
    available: true,
  };
}

function buildUnavailablePeriod(
  period: PerformancePeriodId,
  holdings: StoredPortfolioHolding[],
): PortfolioPerformanceResult {
  const endingValue = sumCurrentPortfolioValue(holdings);

  return {
    period,
    periodLabel: periodLabel(period),
    calculationMethod: "unavailable",
    dataAvailability: "unavailable",
    availabilityMessage: "History will build automatically over time.",
    currentPortfolioValue: endingValue,
    startingPortfolioValue: null,
    endingPortfolioValue: endingValue,
    netContributions: null,
    investmentReturn: null,
    investmentReturnPercent: null,
    lastUpdatedAt: resolveLatestUpdateAt(holdings),
    chartPoints: [],
    chartHasSeries: false,
    bestHolding: null,
    worstHolding: null,
    holdingLeadersAvailable: false,
  };
}

export type CalculatePortfolioPerformanceOptions = {
  period: PerformancePeriodId;
  asOf?: Date;
};

/** Pure calculation entry point — safe for tests and UI memoization. */
export function calculatePortfolioPerformance(
  holdings: StoredPortfolioHolding[],
  options: CalculatePortfolioPerformanceOptions,
): PortfolioPerformanceResult {
  const asOf = options.asOf ?? new Date();
  const period = options.period;

  if (holdings.length === 0) {
    return {
      period,
      periodLabel: periodLabel(period),
      calculationMethod: "unavailable",
      dataAvailability: "unavailable",
      availabilityMessage: "Add holdings to track portfolio performance.",
      currentPortfolioValue: 0,
      startingPortfolioValue: null,
      endingPortfolioValue: null,
      netContributions: null,
      investmentReturn: null,
      investmentReturnPercent: null,
      lastUpdatedAt: null,
      chartPoints: [],
      chartHasSeries: false,
      bestHolding: null,
      worstHolding: null,
      holdingLeadersAvailable: false,
    };
  }

  if (period === "1D") {
    return buildDailyPerformance(holdings, asOf);
  }

  if (period === "ALL") {
    return buildSinceInceptionSummary(holdings, asOf);
  }

  return buildUnavailablePeriod(period, holdings);
}

export { METHOD as CONTRIBUTION_ADJUSTED_SIMPLE_RETURN_METHOD };
