/**
 * Saved Monthly Review snapshot — historically stable after creation.
 */

import type { CompanionReview } from "@/lib/services/portfolio/companion/types";

export type MonthlyReviewSnapshotStatus = "ready" | "failed" | "skipped";

export type MonthlyReviewMetrics = {
  startingValue: number | null;
  endingValue: number | null;
  portfolioMovement: number | null;
  investmentReturn: number | null;
  netContributions: number | null;
  contributed: number | null;
  withdrawn: number | null;
  dividends: number | null;
  baseCurrency: string;
  strongestContributor: string | null;
  weakestContributor: string | null;
};

export type MonthlyReviewSnapshotPayload = {
  review: CompanionReview;
  metrics: MonthlyReviewMetrics;
  schemaVersion: 1;
};

export type MonthlyReviewSnapshotRow = {
  id: string;
  user_id: string;
  portfolio_id: string;
  year_month: string;
  period_start: string;
  period_end: string;
  period_kind: string;
  timezone: string;
  base_currency: string;
  payload: MonthlyReviewSnapshotPayload;
  source_hash: string | null;
  status: MonthlyReviewSnapshotStatus;
  version: number;
  generated_at: string;
  emailed_at: string | null;
  email_status: string | null;
};

export type MonthlyReviewArchiveItem = {
  id: string;
  yearMonth: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  status: MonthlyReviewSnapshotStatus;
  /** Coarse indicator only — no portfolio values. */
  direction: "up" | "down" | "flat" | "unknown";
  label: string;
  isDemo: boolean;
};

export const MONTHLY_REVIEW_EMAIL_PREF_KEY = "monthly_review_email_opt_in" as const;

export function yearMonthFromIsoDate(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return isoDate.slice(0, 7);
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function archiveDirectionFromMetrics(
  metrics: MonthlyReviewMetrics | null | undefined,
): MonthlyReviewArchiveItem["direction"] {
  const move = metrics?.portfolioMovement;
  if (move == null || !Number.isFinite(move)) return "unknown";
  if (Math.abs(move) < 1) return "flat";
  return move > 0 ? "up" : "down";
}
