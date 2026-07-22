import {
  goalStorageKey,
  portfolioStorageKey,
  portfolioSyncMetaKey,
} from "@/lib/client/portfolioStorageKeys";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import { summarizePortfolioHoldings } from "@/lib/services/portfolio/portfolioPersistenceGuard";
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
  const localSummary = summarizePortfolioHoldings(localHoldings);
  const remoteSummary = remoteSnapshot
    ? summarizePortfolioHoldings(remoteSnapshot.holdings)
    : null;
  const meta =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem(portfolioSyncMetaKey(userSub));
            return raw ? (JSON.parse(raw) as { lastLocalRevision?: number }) : null;
          } catch {
            return null;
          }
        })()
      : null;

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
    localInvestmentCount: localSummary.investments,
    localCashCount: localSummary.cash,
    cloudInvestmentCount: remoteSummary?.investments ?? 0,
    cloudCashCount: remoteSummary?.cash ?? 0,
    lastLocalRevision: meta?.lastLocalRevision ?? null,
    localGoalPresent: localGoal != null,
    cloudGoalPresent: remoteSnapshot?.goal != null,
  };
}

export function logPortfolioPersistenceEvent(
  stage: string,
  payload: Record<string, unknown>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  console.group(`[portfolio persistence] ${stage}`);
  console.log(payload);
  console.groupEnd();
}
