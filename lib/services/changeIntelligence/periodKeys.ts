/**
 * ISO-week and calendar-month period keys in Europe/Amsterdam.
 * Snapshots target the most recently completed week or month — not the in-progress period.
 */

import {
  INTELLIGENCE_STATE_TIMEZONE,
} from "@/lib/services/changeIntelligence/config";
import type {
  IntelligencePeriodIdentity,
  IntelligenceSnapshotKind,
} from "@/lib/services/changeIntelligence/types";

export type CalendarYmd = {
  year: number;
  month: number;
  day: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function calendarDateInTimeZone(
  date: Date,
  timeZone: string = INTELLIGENCE_STATE_TIMEZONE,
): CalendarYmd {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function utcMsFromYmd(ymd: CalendarYmd): number {
  return Date.UTC(ymd.year, ymd.month - 1, ymd.day);
}

function ymdFromUtcMs(ms: number): CalendarYmd {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addDays(ymd: CalendarYmd, days: number): CalendarYmd {
  return ymdFromUtcMs(utcMsFromYmd(ymd) + days * 24 * 60 * 60 * 1000);
}

/**
 * ISO week-year and week number from a calendar Y-M-D (Thursday rule).
 */
export function isoWeekFromYmd(ymd: CalendarYmd): { year: number; week: number } {
  const date = new Date(utcMsFromYmd(ymd));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

export function isoWeekPeriodKey(ymd: CalendarYmd): string {
  const { year, week } = isoWeekFromYmd(ymd);
  return `${year}-W${pad2(week)}`;
}

export function monthPeriodKey(ymd: CalendarYmd): string {
  return `${ymd.year}-${pad2(ymd.month)}`;
}

export function isoWeekBounds(ymd: CalendarYmd): {
  start: CalendarYmd;
  end: CalendarYmd;
} {
  const date = new Date(utcMsFromYmd(ymd));
  const dayNum = date.getUTCDay() || 7;
  const start = addDays(ymd, 1 - dayNum);
  const end = addDays(start, 6);
  return { start, end };
}

export function monthBounds(ymd: CalendarYmd): {
  start: CalendarYmd;
  end: CalendarYmd;
} {
  const start = { year: ymd.year, month: ymd.month, day: 1 };
  const nextMonth =
    ymd.month === 12
      ? { year: ymd.year + 1, month: 1, day: 1 }
      : { year: ymd.year, month: ymd.month + 1, day: 1 };
  const end = addDays(nextMonth, -1);
  return { start, end };
}

export function formatIsoDate(ymd: CalendarYmd): string {
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

/**
 * Most recently completed ISO week or calendar month in the snapshot timezone.
 * Capturing on 18 Aug 2026 stores weekly/2026-W33 and monthly/2026-07.
 */
export function resolveCompletedIntelligencePeriod(
  snapshotKind: IntelligenceSnapshotKind,
  now: Date = new Date(),
  timeZone: string = INTELLIGENCE_STATE_TIMEZONE,
): IntelligencePeriodIdentity {
  const today = calendarDateInTimeZone(now, timeZone);

  if (snapshotKind === "weekly") {
    const inCompletedWeek = addDays(today, -7);
    const bounds = isoWeekBounds(inCompletedWeek);
    return {
      snapshotKind,
      periodKey: isoWeekPeriodKey(inCompletedWeek),
      periodStart: formatIsoDate(bounds.start),
      periodEnd: formatIsoDate(bounds.end),
      timezone: timeZone,
    };
  }

  const inCompletedMonth =
    today.month === 1
      ? { year: today.year - 1, month: 12, day: 1 }
      : { year: today.year, month: today.month - 1, day: 1 };
  const bounds = monthBounds(inCompletedMonth);
  return {
    snapshotKind,
    periodKey: monthPeriodKey(inCompletedMonth),
    periodStart: formatIsoDate(bounds.start),
    periodEnd: formatIsoDate(bounds.end),
    timezone: timeZone,
  };
}

export function isValidPeriodKey(
  snapshotKind: IntelligenceSnapshotKind,
  periodKey: string,
): boolean {
  if (snapshotKind === "weekly") {
    return /^\d{4}-W[0-5][0-9]$/.test(periodKey);
  }
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey);
}
