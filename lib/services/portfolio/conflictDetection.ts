import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { buildSyncPreview } from "@/lib/services/portfolio/mappers";
import {
  portfolioContentFingerprint,
} from "@/lib/services/portfolio/idempotency";
import { summarizePortfolioHoldings } from "@/lib/services/portfolio/portfolioPersistenceGuard";
import type {
  PortfolioSyncPreview,
  PortfolioSyncResolution,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";

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

  const localSummary = summarizePortfolioHoldings(localHoldings);
  const remoteSummary = summarizePortfolioHoldings(remoteSnapshot.holdings);

  if (
    localSummary.investments > remoteSummary.investments &&
    remoteSummary.investments === 0 &&
    localCount > remoteCount
  ) {
    return {
      kind: "conflict",
      localFingerprint,
      remoteFingerprint,
    };
  }

  if (localFingerprint === remoteFingerprint) {
    return { kind: "aligned", snapshot: remoteSnapshot };
  }

  return {
    kind: "conflict",
    localFingerprint,
    remoteFingerprint,
  };
}

export function buildMigrationPreviewFromLocal(
  holdings: StoredPortfolioHolding[],
  userId: string,
): PortfolioSyncPreview {
  return buildSyncPreview(holdings, null, [], userId);
}
