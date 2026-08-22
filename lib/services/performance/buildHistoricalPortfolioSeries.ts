/**
 * Aggregate a constant-holdings portfolio value series from EOD closes.
 *
 * Method notes
 * ------------
 * - Quantities are CURRENT holdings held constant across the window
 *   (market-price movement only — not a true time-weighted portfolio path).
 * - netContributions are treated as null / not deducted (unknown flows),
 *   matching contribution_adjusted_simple_return when flows are unknown.
 * - Cash holdings stay flat at their current cash value for every point.
 * - Listing-currency closes are converted with the provided fxRateToEur map
 *   (typically current FX — callers disclose via historicalFxApproximate).
 * - Never invents prices; never reuses a 1D previousClose two-point series.
 */

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import { buildHoldingPeriodMovesFromEod } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";
import type {
  BuildHistoricalPortfolioSeriesInput,
  EodHistoryPoint,
  HistoricalPortfolioSeriesResult,
  PerformanceHistoryHoldingInput,
} from "@/lib/services/performance/types";

function startOfUtcDayFromIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveFxRate(
  fxRateToEur: BuildHistoricalPortfolioSeriesInput["fxRateToEur"],
  currency: string,
): number | null {
  const key = currency.trim().toUpperCase();
  if (key === "EUR") return 1;

  let rate: number | null | undefined;
  if (typeof (fxRateToEur as Map<string, number>).get === "function") {
    rate = (fxRateToEur as Map<string, number>).get(key);
  } else {
    rate = (fxRateToEur as Record<string, number | null | undefined>)[key];
  }

  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? rate
    : null;
}

function resolveQuoteCurrency(holding: PerformanceHistoryHoldingInput): string {
  const raw = holding.quoteCurrency?.trim();
  return raw ? raw.toUpperCase() : "EUR";
}

function cashValueEur(holding: PerformanceHistoryHoldingInput): number {
  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
    return 0;
  }
  const price =
    typeof holding.currentPrice === "number" && holding.currentPrice > 0
      ? holding.currentPrice
      : 1;
  return holding.quantity * price;
}

function filterPointsInWindow(
  points: EodHistoryPoint[],
  startIso: string,
  endIso: string,
): EodHistoryPoint[] {
  return points
    .filter(
      (point) =>
        point.date >= startIso &&
        point.date <= endIso &&
        Number.isFinite(point.value) &&
        point.value > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** ISO week key YYYY-Www for weekly downsampling. */
function isoWeekKey(isoDate: string): string {
  const date = startOfUtcDayFromIso(isoDate);
  // ISO week date algorithm
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Keep the last point of each ISO week; always preserve the final point.
 */
export function downsampleToWeekly(
  points: PortfolioPerformancePoint[],
): PortfolioPerformancePoint[] {
  if (points.length <= 1) return points;

  const result: PortfolioPerformancePoint[] = [];
  let currentWeek: string | null = null;
  let lastInWeek: PortfolioPerformancePoint | null = null;

  for (const point of points) {
    const dateKey = point.date.slice(0, 10);
    const week = isoWeekKey(dateKey);
    if (currentWeek !== null && week !== currentWeek && lastInWeek) {
      result.push(lastInWeek);
    }
    currentWeek = week;
    lastInWeek = point;
  }

  if (lastInWeek) {
    const already =
      result.length > 0 && result[result.length - 1]!.date === lastInWeek.date;
    if (!already) {
      result.push(lastInWeek);
    }
  }

  return result;
}

function lookupFxMap(
  fxRateToEur: BuildHistoricalPortfolioSeriesInput["fxRateToEur"],
): (currency: string) => number | null {
  return (currency: string) => resolveFxRate(fxRateToEur, currency);
}

type CoveredHolding = {
  holding: PerformanceHistoryHoldingInput;
  providerSymbol: string;
  points: EodHistoryPoint[];
  fxRate: number;
  usesApproximateFx: boolean;
};

function unavailableResult(
  period: BuildHistoricalPortfolioSeriesInput["window"]["period"],
  coveredHoldingCount: number,
  skippedHoldingCount: number,
  earliestAvailableDate: string | null,
  historicalFxApproximate: boolean,
  message: string,
): HistoricalPortfolioSeriesResult {
  return {
    period,
    chartPoints: [],
    startingValue: null,
    endingValue: null,
    investmentReturn: null,
    investmentReturnPercent: null,
    dataAvailability: "unavailable",
    availabilityMessage: message,
    historicalFxApproximate,
    coveredHoldingCount,
    skippedHoldingCount,
    earliestAvailableDate,
  };
}

/**
 * Build an aggregated portfolio EUR value series from EOD points.
 *
 * Does not invent prices. Returns unavailable when fewer than 2 points
 * can be formed after coverage alignment.
 */
export function buildHistoricalPortfolioSeries(
  input: BuildHistoricalPortfolioSeriesInput,
): HistoricalPortfolioSeriesResult {
  const { holdings, historyByProviderSymbol, window } = input;
  const startIso = toIsoDate(window.startDate);
  const endIso = toIsoDate(window.endDate);
  const getFx = lookupFxMap(input.fxRateToEur);

  let cashFlatEur = 0;
  let skippedHoldingCount = 0;
  const covered: CoveredHolding[] = [];
  let anyApproximateFx = false;

  for (const holding of holdings) {
    if (holding.assetType === "cash") {
      cashFlatEur += cashValueEur(holding);
      continue;
    }

    const providerSymbol = holding.providerSymbol?.trim();
    if (!providerSymbol) {
      skippedHoldingCount += 1;
      continue;
    }

    if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
      skippedHoldingCount += 1;
      continue;
    }

    const quoteCurrency = resolveQuoteCurrency(holding);
    const fxRate = getFx(quoteCurrency);
    if (fxRate === null) {
      skippedHoldingCount += 1;
      continue;
    }

    const rawHistory =
      historyByProviderSymbol.get(providerSymbol) ??
      historyByProviderSymbol.get(providerSymbol.toUpperCase()) ??
      [];
    const points = filterPointsInWindow(rawHistory, startIso, endIso);
    if (points.length === 0) {
      skippedHoldingCount += 1;
      continue;
    }

    const usesApproximateFx = quoteCurrency !== "EUR";
    if (usesApproximateFx) anyApproximateFx = true;

    covered.push({
      holding,
      providerSymbol,
      points,
      fxRate,
      usesApproximateFx,
    });
  }

  const historicalFxApproximate =
    input.historicalFxApproximate ?? anyApproximateFx;

  const earliestAvailableDate =
    covered.length === 0
      ? null
      : (covered.map((item) => item.points[0]!.date).sort()[0] ?? null);

  if (covered.length === 0) {
    const message =
      earliestAvailableDate != null
        ? `Insufficient price history for this period. Earliest available data: ${earliestAvailableDate}.`
        : "Insufficient price history for this period. No end-of-day prices were available for the selected holdings.";

    return unavailableResult(
      window.period,
      0,
      skippedHoldingCount,
      earliestAvailableDate,
      historicalFxApproximate,
      message,
    );
  }

  // First date where every covered holding has at least one prior/on-date close.
  const firstAlignedDate = covered
    .map((item) => item.points[0]!.date)
    .sort()
    .at(-1)!;

  const dateSet = new Set<string>();
  for (const item of covered) {
    for (const point of item.points) {
      if (point.date >= firstAlignedDate && point.date <= endIso) {
        dateSet.add(point.date);
      }
    }
  }

  const dates = [...dateSet].sort();

  // Cursor per holding for O(n) forward-fill on sorted dates.
  const cursors = covered.map(() => -1);
  const lastClose = covered.map(() => null as number | null);

  const dailyPoints: PortfolioPerformancePoint[] = [];

  for (const date of dates) {
    let investmentsEur = 0;
    let complete = true;

    for (let i = 0; i < covered.length; i += 1) {
      const item = covered[i]!;
      const points = item.points;
      let cursor = cursors[i]!;

      while (cursor + 1 < points.length && points[cursor + 1]!.date <= date) {
        cursor += 1;
      }
      cursors[i] = cursor;

      if (cursor < 0) {
        complete = false;
        break;
      }

      lastClose[i] = points[cursor]!.value;
      investmentsEur += item.holding.quantity * lastClose[i]! * item.fxRate;
    }

    if (!complete) continue;

    const portfolioValue = investmentsEur + cashFlatEur;
    if (!(portfolioValue > 0)) continue;

    dailyPoints.push({
      date: startOfUtcDayFromIso(date).toISOString(),
      portfolioValue,
      netContributions: null,
      investmentReturn: null,
    });
  }

  const chartPoints =
    window.granularity === "weekly"
      ? downsampleToWeekly(dailyPoints)
      : dailyPoints;

  if (chartPoints.length < 2) {
    const earliest = earliestAvailableDate;
    const message =
      earliest != null
        ? `Insufficient price history for this period. Earliest available data: ${earliest}.`
        : "Insufficient price history for this period.";

    return unavailableResult(
      window.period,
      covered.length,
      skippedHoldingCount,
      earliest,
      historicalFxApproximate,
      message,
    );
  }

  const startingValue = chartPoints[0]!.portfolioValue;
  const endingValue = chartPoints[chartPoints.length - 1]!.portfolioValue;
  // Unknown flows → treat as null (not deducted); math uses 0.
  const investmentReturn = endingValue - startingValue;
  const investmentReturnPercent =
    startingValue > 0 ? (investmentReturn / startingValue) * 100 : null;

  const withReturns: PortfolioPerformancePoint[] = chartPoints.map(
    (point, index) => ({
      ...point,
      investmentReturn: index === 0 ? 0 : point.portfolioValue - startingValue,
    }),
  );

  const partial = skippedHoldingCount > 0;
  const holdingMoves = buildHoldingPeriodMovesFromEod(input);

  return {
    period: window.period,
    chartPoints: withReturns,
    startingValue,
    endingValue,
    investmentReturn,
    investmentReturnPercent,
    dataAvailability: partial ? "partial" : "full",
    availabilityMessage: partial
      ? "Some holdings were excluded because provider symbols or convertible prices were missing."
      : null,
    historicalFxApproximate,
    coveredHoldingCount: covered.length,
    skippedHoldingCount,
    earliestAvailableDate,
    holdingMoves,
  };
}
