/**
 * When intelligence-state snapshots may be captured.
 * Review is the preferred caller. Dashboard may use a GET-first safety net
 * for missing completed periods only — never on every render.
 */

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { resolveCompletedIntelligencePeriod } from "@/lib/services/changeIntelligence/periodKeys";
import type {
  IntelligenceSnapshotKind,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type IntelligenceSnapshotCapturePlan = {
  kinds: IntelligenceSnapshotKind[];
  skipReason: string | null;
};

export type ResolveIntelligenceSnapshotCapturePlanInput = {
  isDemo: boolean;
  holdings: StoredPortfolioHolding[];
  weeklyReady: boolean;
  monthlyReady: boolean;
  monthlyPeriodKind: string | null;
};

export function portfolioHasValuedHoldings(
  holdings: StoredPortfolioHolding[],
): boolean {
  if (holdings.length === 0) return false;
  return buildPortfolioAnalysis(holdings).totalValue > 0;
}

/**
 * Weekly: capture the completed ISO week when a weekly review is already ready.
 * Monthly: capture only when the existing monthly review save would run
 * (completed calendar month — not month-to-date).
 */
export function resolveIntelligenceSnapshotCapturePlan(
  input: ResolveIntelligenceSnapshotCapturePlanInput,
): IntelligenceSnapshotCapturePlan {
  if (input.isDemo) {
    return { kinds: [], skipReason: "demo" };
  }
  if (!portfolioHasValuedHoldings(input.holdings)) {
    return { kinds: [], skipReason: "unvalued_portfolio" };
  }

  const kinds: IntelligenceSnapshotKind[] = [];
  if (input.weeklyReady) kinds.push("weekly");
  if (input.monthlyReady && input.monthlyPeriodKind === "calendar_month") {
    kinds.push("monthly");
  }

  if (kinds.length === 0) {
    return { kinds: [], skipReason: "review_not_ready" };
  }
  return { kinds, skipReason: null };
}

export type ResolveDashboardSafetyNetCapturePlanInput = {
  isDemo: boolean;
  holdings: StoredPortfolioHolding[];
  /** True only after a successful snapshot list GET. */
  snapshotsLoaded: boolean;
  snapshots: IntelligenceStateSnapshot[];
  now?: Date;
};

export function hasSnapshotForCompletedPeriod(
  snapshots: IntelligenceStateSnapshot[],
  kind: IntelligenceSnapshotKind,
  now: Date = new Date(),
): boolean {
  const period = resolveCompletedIntelligencePeriod(kind, now);
  return snapshots.some(
    (row) =>
      row.snapshotKind === kind &&
      row.periodKey === period.periodKey &&
      row.payload.isDemo !== true,
  );
}

/**
 * Dashboard fallback: POST only kinds whose completed period is absent
 * from the already-fetched snapshot list. Requires a valued portfolio.
 */
export function resolveDashboardSafetyNetCapturePlan(
  input: ResolveDashboardSafetyNetCapturePlanInput,
): IntelligenceSnapshotCapturePlan {
  if (input.isDemo) {
    return { kinds: [], skipReason: "demo" };
  }
  if (!portfolioHasValuedHoldings(input.holdings)) {
    return { kinds: [], skipReason: "unvalued_portfolio" };
  }
  if (!input.snapshotsLoaded) {
    return { kinds: [], skipReason: "snapshots_unknown" };
  }

  const now = input.now ?? new Date();
  const kinds: IntelligenceSnapshotKind[] = [];
  if (!hasSnapshotForCompletedPeriod(input.snapshots, "weekly", now)) {
    kinds.push("weekly");
  }
  if (!hasSnapshotForCompletedPeriod(input.snapshots, "monthly", now)) {
    kinds.push("monthly");
  }

  if (kinds.length === 0) {
    return { kinds: [], skipReason: "already_present" };
  }
  return { kinds, skipReason: null };
}

export function dashboardSafetyNetAttemptKey(
  plan: IntelligenceSnapshotCapturePlan,
  now: Date = new Date(),
): string {
  if (plan.kinds.length === 0) return "";
  const weekly = resolveCompletedIntelligencePeriod("weekly", now).periodKey;
  const monthly = resolveCompletedIntelligencePeriod("monthly", now).periodKey;
  return `${weekly}|${monthly}|${plan.kinds.join(",")}`;
}
