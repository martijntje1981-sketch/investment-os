/**
 * Pick the latest trustworthy stored snapshot as the previous known state.
 * One snapshot is enough for live-vs-stored comparison. Never invents one.
 */

import type {
  IntelligenceSnapshotKind,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

export function selectLatestStoredSnapshot(
  snapshots: IntelligenceStateSnapshot[] | null | undefined,
): IntelligenceStateSnapshot | null {
  if (!snapshots || snapshots.length === 0) return null;
  const usable = snapshots.filter((row) => row.payload.isDemo !== true);
  if (usable.length === 0) return null;

  const ranked = [...usable].sort((left, right) => {
    const captured = right.capturedAt.localeCompare(left.capturedAt);
    if (captured !== 0) return captured;
    const kindRank = (kind: IntelligenceSnapshotKind) =>
      kind === "monthly" ? 1 : 0;
    return kindRank(right.snapshotKind) - kindRank(left.snapshotKind);
  });
  return ranked[0] ?? null;
}
