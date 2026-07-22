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
import {
  portfolioStorageKey,
  portfolioSyncMetaKey,
} from "@/lib/client/portfolioStorageKeys";
import type {
  FetchRemotePortfolioResult,
  PortfolioSyncMeta,
} from "@/lib/client/portfolioSyncApi";
import {
  buildSyncFingerprintDiagnostics,
  logPortfolioPersistenceEvent,
  logPortfolioSyncDiagnostics,
} from "@/lib/client/portfolioSyncDebug";
import { writePortfolioToStorage, readPortfolioFromStorage } from "@/lib/client/userPortfolioStorage";
import { writeUserGoal, clearUserGoal, readSavedUserGoal } from "@/lib/client/userGoalStorage";
import { writeImportMappingsToCache } from "@/lib/services/import/mappingMemory";
import { mergeRemoteMarketPrice } from "@/lib/client/portfolioPerformance";
import {
  portfolioContentFingerprint,
  portfoliosContentMatch,
} from "@/lib/services/portfolio/idempotency";
import {
  countEnrichedHoldings,
  shouldApplyRemoteSnapshot,
  summarizePortfolioHoldings,
  validatePortfolioBeforeSave,
} from "@/lib/services/portfolio/portfolioPersistenceGuard";

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
  options?: {
    preserveLocalPrices?: StoredPortfolioHolding[];
    sentHoldings?: StoredPortfolioHolding[];
    context?: "hydrate" | "push_response" | "conflict_resolution";
    force?: boolean;
  },
): StoredPortfolioHolding[] {
  const localHoldings = options?.preserveLocalPrices ?? readPortfolioFromStorage(userSub);
  const localGoal = readSavedUserGoal(userSub);
  const decision = options?.force
    ? { apply: true as const, reason: "forced", stale: false }
    : shouldApplyRemoteSnapshot(localHoldings, snapshot.holdings, {
        sentHoldings: options?.sentHoldings,
        localGoal,
        remoteGoal: snapshot.goal,
        context: options?.context ?? "push_response",
      });

  const beforeSummary = summarizePortfolioHoldings(localHoldings);
  const remoteSummary = summarizePortfolioHoldings(snapshot.holdings);

  logPortfolioPersistenceEvent("remote snapshot apply decision", {
    userSub,
    context: options?.context ?? "push_response",
    apply: decision.apply,
    reason: decision.reason,
    stale: "stale" in decision ? decision.stale : false,
    before: beforeSummary,
    remote: remoteSummary,
    sent: options?.sentHoldings
      ? summarizePortfolioHoldings(options.sentHoldings)
      : null,
  });

  if (!decision.apply) {
    logPortfolioSyncDiagnostics("stale remote snapshot rejected", {
      userSub,
      reason: decision.reason,
      localHoldingCount: beforeSummary.total,
      remoteHoldingCount: remoteSummary.total,
    });
    return localHoldings;
  }

  const priceById = new Map(
    localHoldings.map((holding) => [holding.id, holding]),
  );
  const priceBySymbol = new Map(
    localHoldings.map((holding) => [
      `${holding.symbol}:${holding.assetType ?? "investment"}`,
      holding,
    ]),
  );

  const holdings = snapshot.holdings.map((holding) => {
    const localHolding =
      priceById.get(holding.id) ??
      priceBySymbol.get(`${holding.symbol}:${holding.assetType ?? "investment"}`);
    const mergedPrice = mergeRemoteMarketPrice(
      holding,
      localHolding?.currentPrice,
    );

    return {
      ...holding,
      providerSymbol: holding.providerSymbol ?? localHolding?.providerSymbol ?? null,
      exchange: holding.exchange ?? localHolding?.exchange ?? null,
      instrumentName:
        holding.instrumentName ?? localHolding?.instrumentName ?? null,
      isin: holding.isin ?? localHolding?.isin ?? null,
      confirmationSource:
        holding.confirmationSource ?? localHolding?.confirmationSource,
      matchMethod: holding.matchMethod ?? localHolding?.matchMethod,
      matchConfidence: holding.matchConfidence ?? localHolding?.matchConfidence,
      requiresConfirmation:
        holding.requiresConfirmation ?? localHolding?.requiresConfirmation,
      matchWarnings: holding.matchWarnings ?? localHolding?.matchWarnings,
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

  const validation = validatePortfolioBeforeSave(holdings);
  if (!validation.ok) {
    logPortfolioSyncDiagnostics("remote snapshot validation failed", {
      userSub,
      message: validation.message,
    });
    return localHoldings;
  }

  writePortfolioToStorage(userSub, holdings);

  if (snapshot.goal) {
    writeUserGoal(userSub, snapshot.goal);
  } else {
    clearUserGoal(userSub);
  }

  if (snapshot.importMappings.length > 0) {
    writeImportMappingsToCache(userSub, snapshot.importMappings);
  }

  writePortfolioSyncMeta(userSub, {
    ...readPortfolioSyncMeta(userSub),
    version: PORTFOLIO_SYNC_VERSION,
    lastSuccessfulRemoteAt: snapshot.remoteUpdatedAt ?? new Date().toISOString(),
    lastSyncError: null,
    lastLocalInvestmentCount: remoteSummary.investments,
    lastLocalTotalCount: remoteSummary.total,
  });

  logPortfolioPersistenceEvent("remote snapshot applied", {
    userSub,
    after: summarizePortfolioHoldings(holdings),
    enrichmentCount: countEnrichedHoldings(localHoldings, holdings),
  });

  return holdings;
}

export type ConflictResolutionResult =
  | { ok: true; holdings: StoredPortfolioHolding[]; remoteSnapshot: RemotePortfolioSnapshot }
  | { ok: false; message: string };

export type ReReadVerificationResult =
  | {
      ok: true;
      localFingerprint: string;
      cloudFingerprint: string;
      remoteSnapshot: RemotePortfolioSnapshot;
    }
  | { ok: false; message: string; localFingerprint: string; cloudFingerprint: string | null };

/** Re-reads local storage and cloud portfolio; both fingerprints must match. */
export async function verifyPortfolioSyncAfterReRead(
  userSub: string,
  fetchRemotePortfolio: () => Promise<FetchRemotePortfolioResult>,
): Promise<ReReadVerificationResult> {
  const localHoldings = readPortfolioFromStorage(userSub);
  const localGoal = readSavedUserGoal(userSub);
  const localFingerprint = portfolioContentFingerprint(localHoldings, localGoal);

  const remoteResult = await fetchRemotePortfolio();
  if (!remoteResult.ok) {
    const message =
      "error" in remoteResult
        ? remoteResult.error
        : "Could not re-read cloud portfolio after resolution.";
    logPortfolioSyncDiagnostics("re-read failed", {
      userSub,
      message,
      localFingerprint,
    });
    return {
      ok: false,
      message,
      localFingerprint,
      cloudFingerprint: null,
    };
  }

  const cloudFingerprint = portfolioContentFingerprint(
    remoteResult.snapshot.holdings,
    remoteResult.snapshot.goal,
  );

  logPortfolioSyncDiagnostics("re-read fingerprints", {
    ...buildSyncFingerprintDiagnostics(
      userSub,
      localHoldings,
      remoteResult.snapshot,
      localGoal,
    ),
    fingerprintsMatch: localFingerprint === cloudFingerprint,
  });

  if (localFingerprint !== cloudFingerprint) {
    return {
      ok: false,
      message:
        "Resolution did not persist — local and cloud portfolios still differ after re-read.",
      localFingerprint,
      cloudFingerprint,
    };
  }

  return {
    ok: true,
    localFingerprint,
    cloudFingerprint,
    remoteSnapshot: remoteResult.snapshot,
  };
}

/** Applies the cloud portfolio locally and verifies content alignment. */
export function resolveConflictWithRemoteSnapshot(
  userSub: string,
  remoteSnapshot: RemotePortfolioSnapshot,
  localHoldings: StoredPortfolioHolding[],
  localGoal: GoalSettings | null,
): ConflictResolutionResult {
  logPortfolioSyncDiagnostics("resolve use-cloud before apply", {
    action: "use_cloud_portfolio",
    ...buildSyncFingerprintDiagnostics(
      userSub,
      localHoldings,
      remoteSnapshot,
      localGoal,
    ),
  });

  const merged = applyRemoteSnapshotToLocalCache(userSub, remoteSnapshot, {
    preserveLocalPrices: localHoldings,
    context: "conflict_resolution",
    force: true,
  });
  const goalAfterApply = readSavedUserGoal(userSub);

  if (
    !portfoliosContentMatch(
      merged,
      remoteSnapshot.holdings,
      goalAfterApply,
      remoteSnapshot.goal,
    )
  ) {
    return {
      ok: false,
      message:
        "Cloud portfolio was loaded, but local and cloud copies still differ. Nothing was marked resolved.",
    };
  }

  logPortfolioSyncDiagnostics("resolve use-cloud after local write", {
    action: "use_cloud_portfolio",
    localWriteKey: portfolioStorageKey(userSub),
    localFingerprint: portfolioContentFingerprint(merged, goalAfterApply),
    cloudFingerprint: portfolioContentFingerprint(
      remoteSnapshot.holdings,
      remoteSnapshot.goal,
    ),
  });

  return { ok: true, holdings: merged, remoteSnapshot };
}

/** Applies a pushed cloud snapshot locally and verifies content alignment. */
export function resolveConflictWithPushedSnapshot(
  userSub: string,
  snapshot: RemotePortfolioSnapshot,
  localHoldings: StoredPortfolioHolding[],
  localGoal: GoalSettings | null,
): ConflictResolutionResult {
  logPortfolioSyncDiagnostics("resolve keep-local before apply", {
    action: "keep_device_copy",
    cloudWritePath: "PUT /api/portfolio",
    ...buildSyncFingerprintDiagnostics(userSub, localHoldings, snapshot, localGoal),
  });

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
    sentHoldings: localHoldings,
    context: "conflict_resolution",
    force: true,
  });
  const goalAfterApply = readSavedUserGoal(userSub);

  if (
    !portfoliosContentMatch(
      merged,
      snapshot.holdings,
      goalAfterApply,
      snapshot.goal,
    )
  ) {
    return {
      ok: false,
      message:
        "Device portfolio was uploaded, but local verification failed. The conflict remains unresolved.",
    };
  }

  logPortfolioSyncDiagnostics("resolve keep-local after local write", {
    action: "keep_device_copy",
    localWriteKey: portfolioStorageKey(userSub),
    localFingerprint: portfolioContentFingerprint(merged, goalAfterApply),
    cloudFingerprint: portfolioContentFingerprint(
      snapshot.holdings,
      snapshot.goal,
    ),
  });

  return { ok: true, holdings: merged, remoteSnapshot: snapshot };
}

export function markConflictResolutionVerified(
  userSub: string,
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  remoteSnapshot: RemotePortfolioSnapshot,
): void {
  writePortfolioSyncMeta(userSub, {
    ...readPortfolioSyncMeta(userSub),
    version: PORTFOLIO_SYNC_VERSION,
    lastResolvedContentFingerprint: portfolioContentFingerprint(holdings, goal),
    lastSuccessfulRemoteAt:
      remoteSnapshot.remoteUpdatedAt ?? new Date().toISOString(),
    lastSyncError: null,
  });
}

export function recordSyncFailure(userSub: string, message: string): void {
  const meta = readPortfolioSyncMeta(userSub);
  writePortfolioSyncMeta(userSub, {
    ...meta,
    lastSyncError: message,
  });
}

export function recordLocalPortfolioSave(
  userSub: string,
  holdings: StoredPortfolioHolding[],
  revision: number,
): void {
  const summary = summarizePortfolioHoldings(holdings);
  writePortfolioSyncMeta(userSub, {
    ...readPortfolioSyncMeta(userSub),
    version: PORTFOLIO_SYNC_VERSION,
    lastLocalRevision: revision,
    lastLocalSaveAt: new Date().toISOString(),
    lastLocalInvestmentCount: summary.investments,
    lastLocalTotalCount: summary.total,
    lastSyncError: null,
  });

  logPortfolioPersistenceEvent("local portfolio saved", {
    userSub,
    revision,
    total: summary.total,
    investments: summary.investments,
    cash: summary.cash,
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
