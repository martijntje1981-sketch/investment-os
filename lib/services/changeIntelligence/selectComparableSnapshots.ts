/**
 * Pick two stored snapshots of the same kind. Never invent a previous state.
 */

import { buildChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/buildChangeIntelligenceSummary";
import type {
  ChangeIntelligenceSummary,
  IntelligenceSnapshotKind,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

export function snapshotsOfKind(
  snapshots: IntelligenceStateSnapshot[],
  kind: IntelligenceSnapshotKind,
): IntelligenceStateSnapshot[] {
  return snapshots
    .filter(
      (row) => row.snapshotKind === kind && row.payload.isDemo !== true,
    )
    .sort((left, right) => right.periodKey.localeCompare(left.periodKey));
}

export function selectComparableSnapshotPair(
  snapshots: IntelligenceStateSnapshot[],
  preferredKind?: IntelligenceSnapshotKind | null,
): {
  previous: IntelligenceStateSnapshot;
  current: IntelligenceStateSnapshot;
} | null {
  const tryKind = (kind: IntelligenceSnapshotKind) => {
    const rows = snapshotsOfKind(snapshots, kind);
    if (rows.length < 2) return null;
    return { current: rows[0]!, previous: rows[1]! };
  };

  if (preferredKind) return tryKind(preferredKind);
  return tryKind("monthly") ?? tryKind("weekly");
}

export function summarizeStoredChangeIntelligence(
  snapshots: IntelligenceStateSnapshot[],
  preferredKind?: IntelligenceSnapshotKind | null,
): ChangeIntelligenceSummary {
  const pair = selectComparableSnapshotPair(snapshots, preferredKind);
  return buildChangeIntelligenceSummary({
    previous: pair?.previous ?? null,
    current: pair?.current ?? null,
  });
}
