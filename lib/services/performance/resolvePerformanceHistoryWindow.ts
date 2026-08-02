/**
 * Resolve fetch window + chart granularity for multi-day portfolio performance.
 */

import { resolvePeriodBounds } from "@/lib/client/performance/periodBounds";
import type { PerformancePeriodId } from "@/lib/client/performance/types";
import type {
  PerformanceHistoryGranularity,
  PerformanceHistoryWindow,
} from "@/lib/services/performance/types";

/** Downsample ALL history to weekly when the span exceeds this many days. */
export const ALL_WEEKLY_DOWNSAMPLE_SPAN_DAYS = 400;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveGranularity(
  period: PerformancePeriodId,
  spanDays: number,
): PerformanceHistoryGranularity {
  if (period === "ALL" && spanDays > ALL_WEEKLY_DOWNSAMPLE_SPAN_DAYS) {
    return "weekly";
  }
  return "daily";
}

/** Map a performance period to EOD fetch bounds and chart granularity. */
export function resolvePerformanceHistoryWindow(
  period: PerformancePeriodId,
  asOf: Date = new Date(),
): PerformanceHistoryWindow {
  const bounds = resolvePeriodBounds(period, asOf);
  const spanDays = Math.max(
    0,
    Math.round(
      (bounds.endDate.getTime() - bounds.startDate.getTime()) / MS_PER_DAY,
    ),
  );
  const granularity = resolveGranularity(period, spanDays);

  return {
    period: bounds.period,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    fromIsoDate: toIsoDate(bounds.startDate),
    toIsoDate: toIsoDate(bounds.endDate),
    granularity,
    spanDays,
  };
}
