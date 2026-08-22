import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { buildSyncPreview } from "@/lib/services/portfolio/mappers";
import {
  localHasPendingCryptoUpload,
  portfolioContentFingerprint,
} from "@/lib/services/portfolio/idempotency";
import {
  isSuspiciousCashOnlyShrink,
  summarizePortfolioHoldings,
} from "@/lib/services/portfolio/portfolioPersistenceGuard";
import type {
  PortfolioSyncPreview,
  PortfolioSyncResolution,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";

/**
 * Resolve sync state for an authenticated user.
 * Cloud is canonical whenever a usable remote portfolio exists.
 * Divergent local copies no longer surface a conflict UI — they are treated as
 * aligned to remote so hydrate can overwrite the stale device cache.
 */
export function resolvePortfolioSyncState(
  localHoldings: StoredPortfolioHolding[],
  remoteSnapshot: RemotePortfolioSnapshot,
  userId: string,
  localGoal: GoalSettings | null = null,
): PortfolioSyncResolution {
  const localCount = localHoldings.length;
  const remoteCount = remoteSnapshot.holdingCount;
  const localFingerprint = portfolioContentFingerprint(
    localHoldings,
    localGoal,
  );
  const remoteFingerprint = portfolioContentFingerprint(
    remoteSnapshot.holdings,
    remoteSnapshot.goal,
  );

  if (remoteCount === 0 && localCount === 0) {
    return { kind: "remote_only", snapshot: remoteSnapshot };
  }

  if (remoteCount === 0 && localCount > 0) {
    return {
      kind: "migration_offer",
      preview: buildSyncPreview(localHoldings, null, [], userId),
    };
  }

  if (remoteCount > 0 && localCount === 0) {
    return { kind: "remote_only", snapshot: remoteSnapshot };
  }

  // Safety: never auto-prefer a cash-only incomplete cloud over a fuller local book.
  // Keep local silently (no conflict banner) so the user is not prompted repeatedly.
  if (isSuspiciousCashOnlyShrink(localHoldings, remoteSnapshot.holdings)) {
    return { kind: "local_only", localHoldings };
  }

  const localSummary = summarizePortfolioHoldings(localHoldings);
  const remoteSummary = summarizePortfolioHoldings(remoteSnapshot.holdings);

  if (
    localSummary.investments > remoteSummary.investments &&
    remoteSummary.investments === 0 &&
    localCount > remoteCount
  ) {
    return { kind: "local_only", localHoldings };
  }

  if (localFingerprint === remoteFingerprint) {
    return { kind: "aligned", snapshot: remoteSnapshot };
  }

  if (localHasPendingCryptoUpload(localHoldings, remoteSnapshot.holdings)) {
    return { kind: "aligned", snapshot: remoteSnapshot };
  }

  // Authenticated cloud wins for ordinary content divergence.
  return { kind: "aligned", snapshot: remoteSnapshot };
}

export function buildMigrationPreviewFromLocal(
  holdings: StoredPortfolioHolding[],
  userId: string,
): PortfolioSyncPreview {
  return buildSyncPreview(holdings, null, [], userId);
}
