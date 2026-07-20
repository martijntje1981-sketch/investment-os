/**
 * Normalizes provider-specific analyst ratings into Investment OS labels.
 */

import type {
  AnalystRatingCounts,
  NormalizedAnalystRating,
} from "@/lib/types/analyst";
import type { EodhdAnalystRatings } from "@/lib/services/analyst/eodhdAnalystClient";

const RATING_SCORE: Record<NormalizedAnalystRating, number> = {
  "Strong Sell": 1,
  Sell: 2,
  Hold: 3,
  Buy: 4,
  "Strong Buy": 5,
  "No Coverage": 0,
};

export function ratingToScore(rating: NormalizedAnalystRating): number {
  return RATING_SCORE[rating] ?? 0;
}

export function scoreToRating(score: number): NormalizedAnalystRating {
  if (!Number.isFinite(score) || score <= 0) return "No Coverage";
  if (score >= 4.5) return "Strong Buy";
  if (score >= 3.5) return "Buy";
  if (score >= 2.5) return "Hold";
  if (score >= 1.5) return "Sell";
  return "Strong Sell";
}

export function normalizeRatingCounts(
  raw: EodhdAnalystRatings | null,
): AnalystRatingCounts {
  return {
    strongBuy: sanitizeCount(raw?.StrongBuy),
    buy: sanitizeCount(raw?.Buy),
    hold: sanitizeCount(raw?.Hold),
    sell: sanitizeCount(raw?.Sell),
    strongSell: sanitizeCount(raw?.StrongSell),
  };
}

function sanitizeCount(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

export function totalAnalystCount(counts: AnalystRatingCounts): number {
  return (
    counts.strongBuy +
    counts.buy +
    counts.hold +
    counts.sell +
    counts.strongSell
  );
}

export function consensusFromCounts(
  counts: AnalystRatingCounts,
): NormalizedAnalystRating {
  const total = totalAnalystCount(counts);
  if (total === 0) return "No Coverage";

  const weighted =
    counts.strongBuy * 5 +
    counts.buy * 4 +
    counts.hold * 3 +
    counts.sell * 2 +
    counts.strongSell * 1;

  return scoreToRating(weighted / total);
}

export function consensusFromProviderRating(
  rating: number | null | undefined,
  counts: AnalystRatingCounts,
): NormalizedAnalystRating {
  const fromCounts = consensusFromCounts(counts);
  if (fromCounts !== "No Coverage") return fromCounts;

  if (rating == null || !Number.isFinite(rating) || rating <= 0) {
    return "No Coverage";
  }

  return scoreToRating(Number(rating));
}

export function formatConsensusRating(
  rating: NormalizedAnalystRating,
): string {
  return rating === "No Coverage" ? "No coverage" : rating;
}

export function consensusBadgeClass(rating: NormalizedAnalystRating): string {
  switch (rating) {
    case "Strong Buy":
    case "Buy":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "Hold":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Sell":
    case "Strong Sell":
      return "bg-red-50 text-red-800 border-red-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}
