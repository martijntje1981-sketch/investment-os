/**
 * Goal-progress timeframes for the Dashboard strip.
 * Reuses existing performance-history payloads. Never fabricates missing series.
 */

import type {
  PerformanceDataAvailability,
  PortfolioPerformancePoint,
} from "@/lib/client/performance/types";

export const GOAL_PROGRESS_PERIODS = [
  { id: "1M", shortLabel: "1M", label: "1 month" },
  { id: "1Y", shortLabel: "1Y", label: "1 year" },
  { id: "5Y", shortLabel: "5Y", label: "5 years" },
  { id: "ALL", shortLabel: "All", label: "all time" },
] as const;

export type GoalProgressPeriodId = (typeof GOAL_PROGRESS_PERIODS)[number]["id"];

export const GOAL_PROGRESS_PERIOD_ORDER: GoalProgressPeriodId[] = [
  "1M",
  "1Y",
  "5Y",
  "ALL",
];

export type GoalPeriodHistoryInput = {
  startingValue: number | null;
  endingValue: number | null;
  investmentReturn: number | null;
  chartPoints?: PortfolioPerformancePoint[] | null;
  dataAvailability?: PerformanceDataAvailability | null;
  availabilityMessage?: string | null;
};

export type GoalPeriodSnapshot = {
  period: GoalProgressPeriodId;
  available: boolean;
  message: string;
  startValue: number | null;
  endValue: number | null;
  progressChangePp: number | null;
  contributions: number | null;
  investmentReturn: number | null;
  portfolioChange: number | null;
};

const FIVE_YEAR_DAYS = Math.round(365.25 * 5);

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function finiteValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function usablePoints(
  points: PortfolioPerformancePoint[] | null | undefined,
): PortfolioPerformancePoint[] {
  return (points ?? []).filter((point) => Number.isFinite(point.portfolioValue));
}

function percentOfGoal(value: number | null, targetValue: number): number | null {
  if (value === null || targetValue <= 0) return null;
  return (value / targetValue) * 100;
}

function contributionsBetween(
  start: PortfolioPerformancePoint | undefined,
  end: PortfolioPerformancePoint | undefined,
): number | null {
  const startFlows = finiteValue(start?.netContributions ?? null);
  const endFlows = finiteValue(end?.netContributions ?? null);
  if (startFlows === null || endFlows === null) return null;
  return endFlows - startFlows;
}

export function fiveYearCutoffIso(asOf: Date = new Date()): string {
  const cutoff = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  cutoff.setUTCDate(cutoff.getUTCDate() - FIVE_YEAR_DAYS);
  return toIsoDate(cutoff);
}

/**
 * Slice all-time history to a 5-year window only when the series actually
 * reaches that far. Does not invent earlier prices.
 */
export function sliceHistoryToFiveYears(
  history: GoalPeriodHistoryInput | null | undefined,
  asOf: Date = new Date(),
): GoalPeriodHistoryInput | null {
  if (!history) return null;
  const points = usablePoints(history.chartPoints);
  if (points.length < 2) return null;

  const cutoff = fiveYearCutoffIso(asOf);
  const earliest = points[0]!.date;
  if (earliest > cutoff) return null;

  const inWindow = points.filter((point) => point.date >= cutoff);
  if (inWindow.length < 2) return null;

  const start = inWindow[0]!;
  const end = inWindow[inWindow.length - 1]!;
  return {
    startingValue: start.portfolioValue,
    endingValue: end.portfolioValue,
    investmentReturn: null,
    chartPoints: inWindow,
    dataAvailability: history.dataAvailability ?? "partial",
    availabilityMessage: null,
  };
}

function historyIsUsable(history: GoalPeriodHistoryInput | null | undefined): boolean {
  if (!history) return false;
  if (history.dataAvailability === "unavailable") return false;
  const start = finiteValue(history.startingValue);
  const end = finiteValue(history.endingValue);
  if (start !== null && end !== null) return true;
  return usablePoints(history.chartPoints).length >= 2;
}

export function buildGoalPeriodSnapshot(input: {
  period: GoalProgressPeriodId;
  targetValue: number;
  currentValue: number | null;
  history: GoalPeriodHistoryInput | null | undefined;
}): GoalPeriodSnapshot {
  const { period, targetValue } = input;
  const empty = (message: string): GoalPeriodSnapshot => ({
    period,
    available: false,
    message,
    startValue: null,
    endValue: null,
    progressChangePp: null,
    contributions: null,
    investmentReturn: null,
    portfolioChange: null,
  });

  if (!(targetValue > 0)) {
    return empty("Set a valid target to compare progress over time.");
  }

  if (!historyIsUsable(input.history)) {
    return empty(
      period === "5Y"
        ? "Not enough 5-year history yet."
        : "Not enough history for this period yet.",
    );
  }

  const history = input.history!;
  const points = usablePoints(history.chartPoints);
  const startValue =
    finiteValue(history.startingValue) ??
    (points[0] ? points[0].portfolioValue : null);
  const endValue =
    finiteValue(input.currentValue) ??
    finiteValue(history.endingValue) ??
    (points.length > 0 ? points[points.length - 1]!.portfolioValue : null);

  if (startValue === null || endValue === null) {
    return empty("Not enough history for this period yet.");
  }

  const startPercent = percentOfGoal(startValue, targetValue);
  const endPercent = percentOfGoal(endValue, targetValue);
  const progressChangePp =
    startPercent !== null && endPercent !== null
      ? endPercent - startPercent
      : null;

  const startPoint = points[0];
  const endPoint = points.length > 0 ? points[points.length - 1] : undefined;

  return {
    period,
    available: true,
    message: "",
    startValue,
    endValue,
    progressChangePp,
    contributions: contributionsBetween(startPoint, endPoint),
    investmentReturn: finiteValue(history.investmentReturn),
    portfolioChange: endValue - startValue,
  };
}

export function formatGoalPeriodDetail(
  snapshot: GoalPeriodSnapshot,
  formatMoney: (value: number) => string,
): string {
  if (!snapshot.available) return snapshot.message;

  const parts: string[] = [];
  if (snapshot.progressChangePp !== null) {
    const value = snapshot.progressChangePp;
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    parts.push(
      `${sign}${Math.abs(value).toFixed(1)} pp of goal`,
    );
  }

  if (snapshot.contributions !== null) {
    parts.push(`Contributions ${formatMoney(snapshot.contributions)}`);
  }

  if (snapshot.investmentReturn !== null) {
    parts.push(`Growth ${formatMoney(snapshot.investmentReturn)}`);
  } else if (snapshot.portfolioChange !== null) {
    parts.push(`Portfolio change ${formatMoney(snapshot.portfolioChange)}`);
  }

  return parts.length > 0
    ? parts.join(" · ")
    : "History is available, but this period has no extra detail yet.";
}

export function goalProgressPeriodLabel(
  period: GoalProgressPeriodId,
): string {
  return GOAL_PROGRESS_PERIODS.find((item) => item.id === period)?.label ?? period;
}
