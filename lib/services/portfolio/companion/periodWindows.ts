/**
 * Companion period windows — explicitly labelled.
 * Weekly uses rolling 7 days (matches existing performance 1W).
 * Monthly prefers completed calendar month; otherwise month-to-date.
 */

import type { CompanionPeriod, CompanionPeriodKind } from "@/lib/services/portfolio/companion/types";

export type CompanionPeriodWindow = {
  period: CompanionPeriod;
  periodKind: CompanionPeriodKind;
  periodLabel: string;
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatRangeLabel(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T12:00:00.000Z`);
  const end = new Date(`${endIso}T12:00:00.000Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (startIso === endIso) {
    return fmt.format(end);
  }
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/**
 * Resolve the review window.
 * - daily: latest session day (end = asOf)
 * - weekly: rolling 7 calendar days ending asOf (explicitly not ISO calendar week)
 * - monthly: completed previous calendar month when asOf is after month-end day 1;
 *   otherwise current month-to-date
 */
export function resolveCompanionPeriodWindow(
  period: CompanionPeriod,
  asOf: Date = new Date(),
  options?: { preferCompletedMonth?: boolean },
): CompanionPeriodWindow {
  const end = startOfUtcDay(asOf);
  const endIso = toIsoDate(end);

  if (period === "daily") {
    return {
      period,
      periodKind: "session",
      periodLabel: "Today",
      startDate: endIso,
      endDate: endIso,
      dateRangeLabel: formatRangeLabel(endIso, endIso),
    };
  }

  if (period === "weekly") {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    const startIso = toIsoDate(start);
    return {
      period,
      periodKind: "rolling_7d",
      periodLabel: "This week",
      startDate: startIso,
      endDate: endIso,
      dateRangeLabel: `Last 7 days · ${formatRangeLabel(startIso, endIso)}`,
    };
  }

  const preferCompleted = options?.preferCompletedMonth !== false;
  const year = end.getUTCFullYear();
  const month = end.getUTCMonth();

  // On/after the 2nd of the month, the previous calendar month is a completed review.
  if (preferCompleted && end.getUTCDate() >= 2) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const startIso = toIsoDate(monthStart);
    const completedEndIso = toIsoDate(monthEnd);
    const monthName = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(monthStart);
    return {
      period,
      periodKind: "calendar_month",
      periodLabel: "This month",
      startDate: startIso,
      endDate: completedEndIso,
      dateRangeLabel: `${monthName} · ${formatRangeLabel(startIso, completedEndIso)}`,
    };
  }

  const mtdStart = new Date(Date.UTC(year, month, 1));
  const startIso = toIsoDate(mtdStart);
  return {
    period,
    periodKind: "month_to_date",
    periodLabel: "Month to date",
    startDate: startIso,
    endDate: endIso,
    dateRangeLabel: `Month to date · ${formatRangeLabel(startIso, endIso)}`,
  };
}
