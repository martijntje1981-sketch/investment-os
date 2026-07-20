import { portfolioStorageKey, portfolioSyncMetaKey } from "@/lib/client/portfolioStorageKeys";
import { goalStorageKey } from "@/lib/client/portfolioStorageKeys";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

/** Temporary diagnostics for recurring portfolio conflict resolution. */
export function logPortfolioSyncDiagnostics(
  stage: string,
  payload: Record<string, unknown>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  console.group(`[portfolio sync] ${stage}`);
  console.log(payload);
  console.groupEnd();
}

export function buildSyncFingerprintDiagnostics(
  userSub: string,
  localHoldings: StoredPortfolioHolding[],
  remoteSnapshot: RemotePortfolioSnapshot | null,
  localGoal: GoalSettings | null,
) {
  return {
    userSub,
    storageKeys: {
      holdings: portfolioStorageKey(userSub),
      goal: goalStorageKey(userSub),
      syncMeta: portfolioSyncMetaKey(userSub),
    },
    cloudRecordPath: "GET/PUT /api/portfolio → Supabase holdings + financial_goals (user_id scoped)",
    localFingerprint: portfolioContentFingerprint(localHoldings, localGoal),
    cloudFingerprint: remoteSnapshot
      ? portfolioContentFingerprint(remoteSnapshot.holdings, remoteSnapshot.goal)
      : null,
    localHoldingCount: localHoldings.length,
    cloudHoldingCount: remoteSnapshot?.holdingCount ?? 0,
    localGoalPresent: localGoal != null,
    cloudGoalPresent: remoteSnapshot?.goal != null,
  };
}
