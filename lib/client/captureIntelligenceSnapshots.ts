/**
 * Persist compact intelligence-state snapshots.
 * Review is the preferred caller. Dashboard may POST only as a GET-first
 * safety net when a completed period is missing from the list.
 * Never persists demo portfolios. Never fetches market data.
 */

import { buildIntelligenceStatePayload } from "@/lib/services/changeIntelligence/buildIntelligenceStateSnapshot";
import {
  resolveDashboardSafetyNetCapturePlan,
  resolveIntelligenceSnapshotCapturePlan,
} from "@/lib/services/changeIntelligence/capturePolicy";
import type {
  IntelligenceSnapshotKind,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CaptureIntelligenceSnapshotsInput = {
  isDemo: boolean;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  weeklyReady: boolean;
  monthlyReady: boolean;
  monthlyPeriodKind: string | null;
};

export type DashboardSafetyNetCaptureInput = {
  isDemo: boolean;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  snapshotsLoaded: boolean;
  snapshots: IntelligenceStateSnapshot[];
  now?: Date;
};

async function postIntelligenceSnapshotKinds(input: {
  kinds: IntelligenceSnapshotKind[];
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
}): Promise<IntelligenceSnapshotKind[]> {
  if (input.kinds.length === 0) return [];

  const payload = buildIntelligenceStatePayload({
    holdings: input.holdings,
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
    isDemo: false,
  });
  if (!payload.portfolio.coverage.portfolioValueAvailable || payload.isDemo) {
    return [];
  }

  await Promise.all(
    input.kinds.map((snapshotKind) =>
      fetch("/api/intelligence/snapshots", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotKind, payload }),
      }).catch(() => undefined),
    ),
  );

  return input.kinds;
}

export async function captureIntelligenceSnapshotsFromReview(
  input: CaptureIntelligenceSnapshotsInput,
): Promise<{ attempted: IntelligenceSnapshotKind[] }> {
  const plan = resolveIntelligenceSnapshotCapturePlan(input);
  if (plan.kinds.length === 0) return { attempted: [] };

  const attempted = await postIntelligenceSnapshotKinds({
    kinds: plan.kinds,
    holdings: input.holdings,
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
  });
  return { attempted };
}

export async function captureIntelligenceSnapshotsDashboardSafetyNet(
  input: DashboardSafetyNetCaptureInput,
): Promise<{ attempted: IntelligenceSnapshotKind[] }> {
  const plan = resolveDashboardSafetyNetCapturePlan(input);
  if (plan.kinds.length === 0) return { attempted: [] };

  const attempted = await postIntelligenceSnapshotKinds({
    kinds: plan.kinds,
    holdings: input.holdings,
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
  });
  return { attempted };
}
