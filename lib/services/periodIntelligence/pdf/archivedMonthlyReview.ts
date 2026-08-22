/**
 * Build a canonical PeriodIntelligenceReview from a saved monthly snapshot.
 * Uses only stored Companion fields. Never mixes live Change Intelligence.
 */

import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";

export function buildArchivedMonthlyPeriodIntelligenceReview(
  payload: MonthlyReviewSnapshotPayload,
): PeriodIntelligenceReview {
  const companion = payload.review;
  const built = buildPeriodIntelligenceReview({
    kind: "monthly",
    companion,
    change: summarizeStoredChangeIntelligence([]),
    snapshotCount: 0,
    intelligenceDepth: "complete",
    concentrationWeightPercent: null,
    largestHoldingName: null,
    resilienceProfile: null,
    holdings: [],
  });

  return applyPeriodIntelligenceDepth(
    {
      ...built,
      isDemo: Boolean(companion.isDemo),
      dataAsOf: built.dataAsOf ?? companion.endDate,
    },
    "complete",
  );
}
