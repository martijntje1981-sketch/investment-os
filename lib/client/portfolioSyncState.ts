import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import { buildSyncPreview } from "@/lib/services/portfolio/mappers";
import { resolvePortfolioSyncState } from "@/lib/services/portfolio/conflictDetection";
import type {
  PortfolioSyncPreview,
  PortfolioSyncResolution,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";
import { PORTFOLIO_SYNC_VERSION } from "@/lib/services/portfolio/types";
import { portfolioSyncMetaKey } from "@/lib/client/portfolioStorageKeys";
import type { PortfolioSyncMeta } from "@/lib/client/portfolioSyncApi";
import { writePortfolioToStorage } from "@/lib/client/userPortfolioStorage";
import { writeUserGoal } from "@/lib/client/userGoalStorage";
import { writeImportMappingsToCache } from "@/lib/services/import/mappingMemory";
import { mergeRemoteMarketPrice } from "@/lib/client/portfolioPerformance";
import {
  portfolioContentFingerprint,
  portfoliosContentMatch,
} from "@/lib/services/portfolio/idempotency";

export type ClientPortfolioSyncState =
  | { status: "loading" }
  | { status: "ready"; source: "remote" | "local" | "cache" }
  | { status: "migration_offer"; preview: PortfolioSyncPreview }
  | {
      status: "conflict";
      localHoldings: StoredPortfolioHolding[];
      remoteSnapshot: RemotePortfolioSnapshot;
      localFingerprint: string;
      remoteFingerprint: string;
      errorMessage?: string;
    }
  | { status: "syncing" }
  | { status: "sync_error"; message: string; retryable: boolean }
  | { status: "offline"; message: string };

export function readPortfolioSyncMeta(userSub: string): PortfolioSyncMeta {
  try {
    const raw = localStorage.getItem(portfolioSyncMetaKey(userSub));
    if (!raw) {
      return { version: PORTFOLIO_SYNC_VERSION };
    }
    const parsed = JSON.parse(raw) as PortfolioSyncMeta;
    return { ...parsed, version: PORTFOLIO_SYNC_VERSION };
  } catch {
    return { version: PORTFOLIO_SYNC_VERSION };
  }
}

export function writePortfolioSyncMeta(
  userSub: string,
  meta: PortfolioSyncMeta,
): void {
  localStorage.setItem(
    portfolioSyncMetaKey(userSub),
    JSON.stringify({ ...meta, version: PORTFOLIO_SYNC_VERSION }),
  );
}

export function resolveClientSyncState(
  userSub: string,
  localHoldings: StoredPortfolioHolding[],
  remoteSnapshot: RemotePortfolioSnapshot | null,
  offline: boolean,
  goal: GoalSettings | null = null,
  importMappings: SavedImportMapping[] = [],
): ClientPortfolioSyncState {
  if (offline && !remoteSnapshot) {
    if (localHoldings.length > 0) {
      return {
        status: "offline",
        message: "Offline — showing your saved portfolio on this device.",
      };
    }
    return {
      status: "offline",
      message: "Offline — connect to load your cloud portfolio.",
    };
  }

  if (!remoteSnapshot) {
    if (localHoldings.length > 0) {
      return { status: "ready", source: "local" };
    }
    return { status: "ready", source: "local" };
  }

  const resolution: PortfolioSyncResolution = resolvePortfolioSyncState(
    localHoldings,
    remoteSnapshot,
    userSub,
    goal,
  );

  switch (resolution.kind) {
    case "migration_offer":
      return {
        status: "migration_offer",
        preview: buildSyncPreview(
          localHoldings,
          goal,
          importMappings,
          userSub,
        ),
      };
    case "conflict":
      return {
        status: "conflict",
        localHoldings,
        remoteSnapshot,
        localFingerprint: resolution.localFingerprint,
        remoteFingerprint: resolution.remoteFingerprint,
      };
    case "remote_only":
    case "aligned":
      return { status: "ready", source: "remote" };
    case "local_only":
      return { status: "ready", source: "local" };
    default:
      return { status: "ready", source: "local" };
  }
}

export function applyRemoteSnapshotToLocalCache(
  userSub: string,
  snapshot: RemotePortfolioSnapshot,
  options?: { preserveLocalPrices?: StoredPortfolioHolding[] },
): StoredPortfolioHolding[] {
  const priceBySymbol = new Map(
    (options?.preserveLocalPrices ?? []).map((holding) => [
      `${holding.symbol}:${holding.assetType ?? "investment"}`,
      holding,
    ]),
  );

  const holdings = snapshot.holdings.map((holding) => {
    const key = `${holding.symbol}:${holding.assetType ?? "investment"}`;
    const localHolding = priceBySymbol.get(key);
    const mergedPrice = mergeRemoteMarketPrice(
      holding,
      localHolding?.currentPrice,
    );

    return {
      ...holding,
      currentPrice: mergedPrice,
      changePercent: localHolding?.changePercent ?? holding.changePercent,
      previousClose: localHolding?.previousClose ?? holding.previousClose,
      changeAmount: localHolding?.changeAmount ?? holding.changeAmount,
      priceDataStatus: localHolding?.priceDataStatus ?? holding.priceDataStatus,
      marketPriceUpdatedAt:
        mergedPrice > 0
          ? localHolding?.marketPriceUpdatedAt ??
            holding.marketPriceUpdatedAt ??
            holding.updatedAt
          : undefined,
    };
  });

  writePortfolioToStorage(userSub, holdings);

  if (snapshot.goal) {
    writeUserGoal(userSub, snapshot.goal);
  }

  if (snapshot.importMappings.length > 0) {
    writeImportMappingsToCache(userSub, snapshot.importMappings);
  }

  writePortfolioSyncMeta(userSub, {
    version: PORTFOLIO_SYNC_VERSION,
    lastSuccessfulRemoteAt: snapshot.remoteUpdatedAt ?? new Date().toISOString(),
    lastSyncError: null,
  });

  return holdings;
}

export type ConflictResolutionResult =
  | { ok: true; holdings: StoredPortfolioHolding[] }
  | { ok: false; message: string };

/** Applies the cloud portfolio locally and verifies content alignment. */
export function resolveConflictWithRemoteSnapshot(
  userSub: string,
  remoteSnapshot: RemotePortfolioSnapshot,
  localHoldings: StoredPortfolioHolding[],
  localGoal: GoalSettings | null,
): ConflictResolutionResult {
  const merged = applyRemoteSnapshotToLocalCache(userSub, remoteSnapshot, {
    preserveLocalPrices: localHoldings,
  });

  if (
    !portfoliosContentMatch(
      merged,
      remoteSnapshot.holdings,
      localGoal,
      remoteSnapshot.goal,
    )
  ) {
    return {
      ok: false,
      message:
        "Cloud portfolio was loaded, but local and cloud copies still differ. Nothing was marked resolved.",
    };
  }

  writePortfolioSyncMeta(userSub, {
    ...readPortfolioSyncMeta(userSub),
    version: PORTFOLIO_SYNC_VERSION,
    lastResolvedContentFingerprint: portfolioContentFingerprint(
      merged,
      localGoal,
    ),
    lastSyncError: null,
  });

  return { ok: true, holdings: merged };
}

/** Applies a pushed cloud snapshot locally and verifies content alignment. */
export function resolveConflictWithPushedSnapshot(
  userSub: string,
  snapshot: RemotePortfolioSnapshot,
  localHoldings: StoredPortfolioHolding[],
  localGoal: GoalSettings | null,
): ConflictResolutionResult {
  if (
    !portfoliosContentMatch(
      localHoldings,
      snapshot.holdings,
      localGoal,
      snapshot.goal,
    )
  ) {
    return {
      ok: false,
      message:
        "Cloud did not reflect the device portfolio after upload. The conflict remains unresolved.",
    };
  }

  const merged = applyRemoteSnapshotToLocalCache(userSub, snapshot, {
    preserveLocalPrices: localHoldings,
  });

  if (
    !portfoliosContentMatch(
      merged,
      snapshot.holdings,
      localGoal,
      snapshot.goal,
    )
  ) {
    return {
      ok: false,
      message:
        "Device portfolio was uploaded, but local verification failed. The conflict remains unresolved.",
    };
  }

  writePortfolioSyncMeta(userSub, {
    ...readPortfolioSyncMeta(userSub),
    version: PORTFOLIO_SYNC_VERSION,
    lastResolvedContentFingerprint: portfolioContentFingerprint(
      merged,
      localGoal,
    ),
    lastSyncError: null,
  });

  return { ok: true, holdings: merged };
}

export function recordSyncFailure(userSub: string, message: string): void {
  const meta = readPortfolioSyncMeta(userSub);
  writePortfolioSyncMeta(userSub, {
    ...meta,
    lastSyncError: message,
  });
}

export function recordMigrationSuccess(
  userSub: string,
  idempotencyKey: string,
  fingerprint: string,
): void {
  writePortfolioSyncMeta(userSub, {
    version: PORTFOLIO_SYNC_VERSION,
    lastMigrationIdempotencyKey: idempotencyKey,
    lastMigrationFingerprint: fingerprint,
    lastSuccessfulRemoteAt: new Date().toISOString(),
    lastSyncError: null,
  });
}
