/**
 * Goal-progress timeframes for the Dashboard strip.
 * Reuses existing performance-history payloads. Never fabricates missing series.
 *
 * Selected-period euros and goal-equivalent points always use the same
 * reconstructed EOD pair (first and last valid history points). Live portfolio
 * value is never spliced into that period math.
 */

import type {
  PerformanceDataAvailability,
  PerformancePeriodId,
  PortfolioPerformancePoint,
} from "@/lib/client/performance/types";
import { resolvePerformanceHistoryWindow } from "@/lib/services/performance/resolvePerformanceHistoryWindow";

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

/** First covered EOD is “materially later” than the requested window after this many days. */
export const MATERIAL_GOAL_PERIOD_COVERAGE_GAP_DAYS = 7;

export const GOAL_PERIOD_PRICE_MOVE_SHORT_EXPLANATION =
  "Based on your current holdings and historical closing prices. Money added or removed is not included.";

export const GOAL_PERIOD_PRICE_MOVE_FULL_EXPLANATION =
  "This estimates how today’s holdings moved using historical closing prices. It is not your contribution-adjusted investment return.";

export const GOAL_PERIOD_SKIPPED_HOLDINGS_NOTE =
  "Some holdings are excluded because closing prices were missing.";

export type GoalPeriodHistoryInput = {
  startingValue: number | null;
  endingValue: number | null;
  investmentReturn: number | null;
  chartPoints?: PortfolioPerformancePoint[] | null;
  dataAvailability?: PerformanceDataAvailability | null;
  availabilityMessage?: string | null;
  skippedHoldingCount?: number | null;
  coveredHoldingCount?: number | null;
};

export type GoalPeriodSnapshot = {
  period: GoalProgressPeriodId;
  available: boolean;
  message: string;
  startValue: number | null;
  endValue: number | null;
  startDateIso: string | null;
  endDateIso: string | null;
  requestedStartIso: string | null;
  coverageIsPartialWindow: boolean;
  skippedHoldingCount: number;
  coveredHoldingCount: number | null;
  progressChangePp: number | null;
  /** Always null: this reconstructed series does not model period cashflows. */
  contributions: number | null;
  portfolioChange: number | null;
};

export type GoalPeriodDetailCopy = {
  unavailable: boolean;
  message: string;
  priceMoveLine: string | null;
  equivalentLine: string | null;
  skippedHoldingsLine: string | null;
  shortExplanation: string;
  fullExplanation: string;
  coverageRangeLabel: string | null;
};

const FIVE_YEAR_DAYS = Math.round(365.25 * 5);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function pointIsoDate(point: PortfolioPerformancePoint): string {
  const raw = point.date;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

function utcDayDiff(laterIso: string, earlierIso: string): number {
  const later = Date.parse(`${laterIso.slice(0, 10)}T00:00:00.000Z`);
  const earlier = Date.parse(`${earlierIso.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return 0;
  return Math.round((later - earlier) / MS_PER_DAY);
}

function formatSignedMoney(
  value: number,
  formatMoney: (amount: number) => string,
): string {
  if (value === 0) return formatMoney(0);
  const abs = formatMoney(Math.abs(value));
  return value > 0 ? `+${abs}` : `−${abs}`;
}

function formatSignedPp(value: number): string {
  if (value === 0) return "0.0";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(1)}`;
}

export function formatGoalPeriodCoverageDate(
  iso: string,
  options: { includeYear?: boolean } = {},
): string {
  const day = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return iso;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: options.includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);
}

export function fiveYearCutoffIso(asOf: Date = new Date()): string {
  const cutoff = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  cutoff.setUTCDate(cutoff.getUTCDate() - FIVE_YEAR_DAYS);
  return toIsoDate(cutoff);
}

export function requestedGoalPeriodStartIso(
  period: GoalProgressPeriodId,
  asOf: Date = new Date(),
): string {
  if (period === "5Y") return fiveYearCutoffIso(asOf);
  const windowPeriod: PerformancePeriodId = period === "ALL" ? "ALL" : period;
  return resolvePerformanceHistoryWindow(windowPeriod, asOf).fromIsoDate;
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
  const earliest = pointIsoDate(points[0]!);
  if (earliest > cutoff) return null;

  const inWindow = points.filter((point) => pointIsoDate(point) >= cutoff);
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
    skippedHoldingCount: history.skippedHoldingCount ?? 0,
    coveredHoldingCount: history.coveredHoldingCount ?? null,
  };
}

function historyIsUsable(history: GoalPeriodHistoryInput | null | undefined): boolean {
  if (!history) return false;
  if (history.dataAvailability === "unavailable") return false;
  return usablePoints(history.chartPoints).length >= 2;
}

function emptySnapshot(
  period: GoalProgressPeriodId,
  message: string,
): GoalPeriodSnapshot {
  return {
    period,
    available: false,
    message,
    startValue: null,
    endValue: null,
    startDateIso: null,
    endDateIso: null,
    requestedStartIso: null,
    coverageIsPartialWindow: false,
    skippedHoldingCount: 0,
    coveredHoldingCount: null,
    progressChangePp: null,
    contributions: null,
    portfolioChange: null,
  };
}

export function buildGoalPeriodSnapshot(input: {
  period: GoalProgressPeriodId;
  targetValue: number;
  history: GoalPeriodHistoryInput | null | undefined;
  asOf?: Date;
}): GoalPeriodSnapshot {
  const { period, targetValue } = input;
  const asOf = input.asOf ?? new Date();

  if (!(targetValue > 0)) {
    return emptySnapshot(
      period,
      "Set a valid target to compare progress over time.",
    );
  }

  if (!historyIsUsable(input.history)) {
    return emptySnapshot(
      period,
      period === "5Y"
        ? "Not enough 5-year history yet."
        : "Not enough history for this period yet.",
    );
  }

  const history = input.history!;
  const points = usablePoints(history.chartPoints);
  const startPoint = points[0]!;
  const endPoint = points[points.length - 1]!;
  const startValue = startPoint.portfolioValue;
  const endValue = endPoint.portfolioValue;
  const startDateIso = pointIsoDate(startPoint);
  const endDateIso = pointIsoDate(endPoint);
  const requestedStartIso = requestedGoalPeriodStartIso(period, asOf);
  const coverageIsPartialWindow =
    utcDayDiff(startDateIso, requestedStartIso) >
    MATERIAL_GOAL_PERIOD_COVERAGE_GAP_DAYS;

  const periodValueChange = endValue - startValue;
  const progressChangePp = (periodValueChange / targetValue) * 100;

  return {
    period,
    available: true,
    message: "",
    startValue,
    endValue,
    startDateIso,
    endDateIso,
    requestedStartIso,
    coverageIsPartialWindow,
    skippedHoldingCount: Math.max(0, history.skippedHoldingCount ?? 0),
    coveredHoldingCount: finiteValue(history.coveredHoldingCount),
    progressChangePp,
    contributions: null,
    portfolioChange: periodValueChange,
  };
}

export function formatGoalPeriodDetailCopy(
  snapshot: GoalPeriodSnapshot,
  formatMoney: (value: number) => string,
): GoalPeriodDetailCopy {
  const shortExplanation = GOAL_PERIOD_PRICE_MOVE_SHORT_EXPLANATION;
  const fullExplanation = GOAL_PERIOD_PRICE_MOVE_FULL_EXPLANATION;

  if (!snapshot.available) {
    return {
      unavailable: true,
      message: snapshot.message,
      priceMoveLine: null,
      equivalentLine: null,
      skippedHoldingsLine: null,
      shortExplanation,
      fullExplanation,
      coverageRangeLabel: null,
    };
  }

  const includeYear =
    Boolean(snapshot.startDateIso && snapshot.endDateIso) &&
    snapshot.startDateIso!.slice(0, 4) !== snapshot.endDateIso!.slice(0, 4);
  const startLabel = snapshot.startDateIso
    ? formatGoalPeriodCoverageDate(snapshot.startDateIso, { includeYear })
    : null;
  const endLabel = snapshot.endDateIso
    ? formatGoalPeriodCoverageDate(snapshot.endDateIso, { includeYear })
    : null;
  const coverageRangeLabel =
    startLabel && endLabel ? `${startLabel} to ${endLabel}` : endLabel;

  const priceMoveLine =
    snapshot.portfolioChange !== null
      ? `Estimated price move ${formatSignedMoney(snapshot.portfolioChange, formatMoney)}`
      : null;

  let equivalentLine: string | null = null;
  if (snapshot.progressChangePp !== null) {
    const equivalent = `Equivalent to ${formatSignedPp(snapshot.progressChangePp)} percentage points of your goal`;
    if (snapshot.coverageIsPartialWindow && startLabel && endLabel) {
      equivalentLine = `${equivalent} · since ${startLabel} · through ${endLabel}`;
    } else if (endLabel) {
      equivalentLine = `${equivalent} · through ${endLabel}`;
    } else {
      equivalentLine = equivalent;
    }
  }

  return {
    unavailable: false,
    message: "",
    priceMoveLine,
    equivalentLine,
    skippedHoldingsLine:
      snapshot.skippedHoldingCount > 0
        ? GOAL_PERIOD_SKIPPED_HOLDINGS_NOTE
        : null,
    shortExplanation,
    fullExplanation,
    coverageRangeLabel,
  };
}

export function formatGoalPeriodDetail(
  snapshot: GoalPeriodSnapshot,
  formatMoney: (value: number) => string,
): string {
  const copy = formatGoalPeriodDetailCopy(snapshot, formatMoney);
  if (copy.unavailable) return copy.message;

  const parts = [
    copy.priceMoveLine,
    copy.equivalentLine,
    copy.skippedHoldingsLine,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(" · ")
    : "History is available, but this period has no extra detail yet.";
}

export function goalProgressPeriodLabel(
  period: GoalProgressPeriodId,
): string {
  return GOAL_PROGRESS_PERIODS.find((item) => item.id === period)?.label ?? period;
}
