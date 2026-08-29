/**
 * Predictable, sanitized PDF filenames from canonical period fields.
 * No intelligence math.
 */

import { isoWeekPeriodKey } from "@/lib/services/changeIntelligence/periodKeys";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function ymdFromIsoDate(iso: string | null): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function periodReportFilePeriodId(
  review: Pick<PeriodIntelligenceReview, "kind" | "period">,
): string {
  const currentKey = review.period.comparisonCurrentKey;
  if (review.kind === "monthly") {
    if (currentKey && /^\d{4}-(0[1-9]|1[0-2])$/.test(currentKey)) {
      return currentKey;
    }
    if (review.period.startDate && /^\d{4}-\d{2}/.test(review.period.startDate)) {
      return review.period.startDate.slice(0, 7);
    }
    return "current";
  }

  if (currentKey && /^\d{4}-W[0-5]\d$/.test(currentKey)) {
    return currentKey;
  }
  const ymd =
    ymdFromIsoDate(review.period.startDate) ??
    ymdFromIsoDate(review.period.endDate);
  if (ymd) return isoWeekPeriodKey(ymd);
  return "current";
}

export function periodReportPdfFilename(
  review: Pick<PeriodIntelligenceReview, "kind" | "period">,
): string {
  const kind = review.kind === "monthly" ? "monthly" : "weekly";
  const periodId = sanitizeFilenamePart(periodReportFilePeriodId(review)) || "current";
  return `tobailey-${kind}-review-${periodId}.pdf`;
}

export function monthlyArchivePdfFilename(yearMonth: string): string {
  const safe = sanitizeFilenamePart(yearMonth);
  return `tobailey-monthly-review-${safe || "current"}.pdf`;
}
