/**
 * Trusted server-side PeriodIntelligenceReview for email.
 * Weekly: stored intelligence snapshots only.
 * Monthly: saved monthly Companion snapshot + optional stored monthly snapshots
 * for that period (never live/current Change Intelligence).
 */

import { buildChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/buildChangeIntelligenceSummary";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import {
  companionFromStoredSnapshots,
  resilienceProfileFromSnapshot,
} from "@/lib/services/periodIntelligence/email/companionFromSnapshot";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";

export function changeForStoredPeriod(
  current: IntelligenceStateSnapshot | null,
  previous: IntelligenceStateSnapshot | null,
) {
  if (!current) {
    return summarizeStoredChangeIntelligence([]);
  }
  return buildChangeIntelligenceSummary({
    previous,
    current,
  });
}

export function buildTrustedWeeklyPeriodReview(input: {
  current: IntelligenceStateSnapshot | null;
  previous: IntelligenceStateSnapshot | null;
}): PeriodIntelligenceReview | null {
  if (!input.current || input.current.payload.isDemo) return null;
  if (input.current.snapshotKind !== "weekly") return null;

  const companion = companionFromStoredSnapshots({
    kind: "weekly",
    current: input.current,
    previous: input.previous,
  });
  const change = changeForStoredPeriod(input.current, input.previous);
  const built = buildPeriodIntelligenceReview({
    kind: "weekly",
    companion,
    change,
    snapshotCount: input.previous ? 2 : 1,
    intelligenceDepth: "complete",
    concentrationWeightPercent:
      input.current.payload.concentration.largestHoldingWeightPercent,
    largestHoldingName: input.current.payload.concentration.largestHoldingName,
    resilienceProfile: resilienceProfileFromSnapshot(input.current),
  });
  return applyPeriodIntelligenceDepth(built, "complete");
}

export function buildTrustedMonthlyPeriodReview(input: {
  payload: MonthlyReviewSnapshotPayload | null | undefined;
  periodKey?: string;
  currentSnapshot?: IntelligenceStateSnapshot | null;
  previousSnapshot?: IntelligenceStateSnapshot | null;
}): PeriodIntelligenceReview | null {
  const companion = input.payload?.review;
  if (!companion || companion.period !== "monthly" || !companion.ready) {
    return null;
  }
  if (companion.isDemo) return null;

  const current =
    input.currentSnapshot &&
    input.currentSnapshot.snapshotKind === "monthly" &&
    !input.currentSnapshot.payload.isDemo &&
    (!input.periodKey || input.currentSnapshot.periodKey === input.periodKey)
      ? input.currentSnapshot
      : null;
  const previous =
    current &&
    input.previousSnapshot &&
    input.previousSnapshot.snapshotKind === "monthly" &&
    !input.previousSnapshot.payload.isDemo
      ? input.previousSnapshot
      : null;

  const change = current
    ? changeForStoredPeriod(current, previous)
    : summarizeStoredChangeIntelligence([]);

  const built = buildPeriodIntelligenceReview({
    kind: "monthly",
    companion,
    change,
    snapshotCount: current && previous ? 2 : current ? 1 : 0,
    intelligenceDepth: "complete",
    concentrationWeightPercent: current
      ? current.payload.concentration.largestHoldingWeightPercent
      : null,
    largestHoldingName: current
      ? current.payload.concentration.largestHoldingName
      : null,
    resilienceProfile: resilienceProfileFromSnapshot(current),
    holdings: [],
  });
  return applyPeriodIntelligenceDepth(built, "complete");
}
