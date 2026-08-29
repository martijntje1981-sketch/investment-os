import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  findLocalListingCounterpart,
  mergeRemoteListingIdentity,
} from "@/lib/services/instruments/confirmedListingIdentity";
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
  applyCachedPrices,
  isVerifiedListingHolding,
  resolveVerifiedListingPriceFromCache,
} from "@/lib/client/portfolioPricing";
import { migrateLegacyCryptoHoldings } from "@/lib/services/portfolio/legacyCryptoHoldingMigration";
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
import {
  omitDeletedHoldings,
  shouldPreserveLocalOnlyCrypto,
} from "@/lib/client/portfolioDeletePersistence";

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

export function readPortfolioSyncMeta(
  userSub: string,
  portfolioId?: string | null,
): PortfolioSyncMeta {
  try {
    const scopedRaw = localStorage.getItem(
      portfolioSyncMetaKey(userSub, portfolioId),
    );
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw) as PortfolioSyncMeta;
      return { ...parsed, version: PORTFOLIO_SYNC_VERSION };
    }
    if (portfolioId) {
      const legacyRaw = localStorage.getItem(portfolioSyncMetaKey(userSub));
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as PortfolioSyncMeta;
        return {
          ...parsed,
          version: PORTFOLIO_SYNC_VERSION,
          lastHydratedSyncVersion: undefined,
          cloudHydratedAt: undefined,
        };
      }
    }
    return { version: PORTFOLIO_SYNC_VERSION };
  } catch {
    return { version: PORTFOLIO_SYNC_VERSION };
  }
}

export function writePortfolioSyncMeta(
  userSub: string,
  meta: PortfolioSyncMeta,
  portfolioId?: string | null,
): void {
  localStorage.setItem(
    portfolioSyncMetaKey(userSub, portfolioId),
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
    deletedIds?: Set<string>;
    lastHydratedSyncVersion?: number;
  },
): StoredPortfolioHolding[] {
  const snapshotPortfolioId = snapshot.portfolioId;
  const snapshotIsPrimary = snapshot.isPrimary !== false;
  const localHoldings =
    options?.preserveLocalPrices ??
    readPortfolioFromStorage(userSub, snapshotPortfolioId, {
      isPrimary: snapshotIsPrimary,
    });
  const localGoal = readSavedUserGoal(userSub, snapshotPortfolioId, {
    isPrimary: snapshotIsPrimary,
  });
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

  const mergedHoldings = snapshot.holdings.map((holding) => {
    const localHolding = findLocalListingCounterpart(holding, localHoldings);
    const effectiveHolding = mergeRemoteListingIdentity(holding, localHolding);

    if (holding.assetType === "crypto") {
      if (
        localHolding &&
        typeof localHolding.currentPairPrice === "number" &&
        localHolding.currentPairPrice > 0
      ) {
        return {
          ...effectiveHolding,
          currentPrice: localHolding.currentPrice,
          currentPairPrice: localHolding.currentPairPrice,
          pairCurrency: effectiveHolding.pairCurrency ?? localHolding.pairCurrency,
          tradingPair: effectiveHolding.tradingPair ?? localHolding.tradingPair,
          change24hPercent: localHolding.change24hPercent,
          change24hAmount: localHolding.change24hAmount,
          changePercent: localHolding.changePercent,
          providerSymbol:
            effectiveHolding.providerSymbol ?? localHolding.providerSymbol ?? null,
          providerId: localHolding.providerId,
          providerName: localHolding.providerName,
          providerDisplayName: localHolding.providerDisplayName,
          quoteSourcePair: localHolding.quoteSourcePair,
          quoteConversionApplied: localHolding.quoteConversionApplied,
          quoteConversionPath: localHolding.quoteConversionPath,
          priceDataStatus: localHolding.priceDataStatus,
          priceUpdatedAt: localHolding.priceUpdatedAt,
          fetchedAt: localHolding.fetchedAt,
          marketPriceUpdatedAt: localHolding.marketPriceUpdatedAt,
        };
      }

      return {
        ...effectiveHolding,
        currentPrice: 0,
        currentPairPrice: null,
        priceDataStatus: "unavailable" as const,
      };
    }

    const fallbackPrice = mergeRemoteMarketPrice(
      holding,
      localHolding?.currentPrice,
    );
    const mergedPrice = isVerifiedListingHolding(effectiveHolding)
      ? resolveVerifiedListingPriceFromCache(
          userSub,
          effectiveHolding,
          fallbackPrice,
        )
      : fallbackPrice;

    return {
      ...effectiveHolding,
      currentPrice: mergedPrice,
      changePercent: localHolding?.changePercent ?? holding.changePercent,
      previousClose: holding.previousClose ?? localHolding?.previousClose,
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

  const remoteIds = new Set(mergedHoldings.map((holding) => holding.id));
  const deletedIds = options?.deletedIds ?? new Set<string>();
  const remoteIsNewerThanLastHydrate =
    typeof snapshot.syncVersion === "number" &&
    typeof options?.lastHydratedSyncVersion === "number" &&
    snapshot.syncVersion > options.lastHydratedSyncVersion;
  // Keep local crypto rows that have not yet appeared in a confirmed remote
  // snapshot (unsynced adds). Never reattach ids the user already deleted.
  const preservedLocalCrypto =
    shouldPreserveLocalOnlyCrypto({
      localHoldings,
      remoteHoldings: snapshot.holdings,
      deletedIds,
      remoteIsNewerThanLastHydrate,
    })
      ? localHoldings.filter(
          (holding) =>
            holding.assetType === "crypto" &&
            !remoteIds.has(holding.id) &&
            !deletedIds.has(holding.id),
        )
      : [];

  const migratedMerged = migrateLegacyCryptoHoldings(mergedHoldings);
  const migratedPreserved = migrateLegacyCryptoHoldings(preservedLocalCrypto);

  const holdings = omitDeletedHoldings(
    applyCachedPrices(userSub, [
      ...migratedMerged.holdings,
      ...migratedPreserved.holdings,
    ]),
    deletedIds,
  );

  const validation = validatePortfolioBeforeSave(holdings);
  if (!validation.ok) {
    logPortfolioSyncDiagnostics("remote snapshot validation failed", {
      userSub,
      message: validation.message,
    });
    return localHoldings;
  }

  writePortfolioToStorage(userSub, holdings, snapshotPortfolioId, {
    isPrimary: snapshotIsPrimary,
  });

  if (snapshot.goal) {
    writeUserGoal(userSub, snapshot.goal, snapshotPortfolioId, {
      isPrimary: snapshotIsPrimary,
    });
  } else {
    clearUserGoal(userSub, snapshotPortfolioId, {
      isPrimary: snapshotIsPrimary,
    });
  }

  if (snapshot.importMappings.length > 0) {
    writeImportMappingsToCache(userSub, snapshot.importMappings);
  }

  writePortfolioSyncMeta(
    userSub,
    {
      ...readPortfolioSyncMeta(userSub, snapshotPortfolioId),
      version: PORTFOLIO_SYNC_VERSION,
      lastSuccessfulRemoteAt: snapshot.remoteUpdatedAt ?? new Date().toISOString(),
      lastSyncError: null,
      lastLocalInvestmentCount: remoteSummary.investments,
      lastLocalTotalCount: remoteSummary.total,
      lastHydratedSyncVersion: snapshot.syncVersion,
      cloudHydratedAt: new Date().toISOString(),
    },
    snapshotPortfolioId,
  );

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
  portfolioId?: string | null,
  isPrimary?: boolean,
): Promise<ReReadVerificationResult> {
  const localHoldings = readPortfolioFromStorage(userSub, portfolioId, {
    isPrimary,
  });
  const localGoal = readSavedUserGoal(userSub, portfolioId, { isPrimary });
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

export function recordCloudHydrate(
  userSub: string,
  snapshot: RemotePortfolioSnapshot,
): void {
  const portfolioId = snapshot.portfolioId;
  writePortfolioSyncMeta(
    userSub,
    {
      ...readPortfolioSyncMeta(userSub, portfolioId),
      version: PORTFOLIO_SYNC_VERSION,
      lastHydratedSyncVersion: snapshot.syncVersion,
      cloudHydratedAt: new Date().toISOString(),
    },
    portfolioId,
  );
}

export function markConflictResolutionVerified(
  userSub: string,
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  remoteSnapshot: RemotePortfolioSnapshot,
): void {
  const portfolioId = remoteSnapshot.portfolioId;
  writePortfolioSyncMeta(
    userSub,
    {
      ...readPortfolioSyncMeta(userSub, portfolioId),
      version: PORTFOLIO_SYNC_VERSION,
      lastResolvedContentFingerprint: portfolioContentFingerprint(holdings, goal),
      lastSuccessfulRemoteAt:
        remoteSnapshot.remoteUpdatedAt ?? new Date().toISOString(),
      lastSyncError: null,
      lastHydratedSyncVersion: remoteSnapshot.syncVersion,
      cloudHydratedAt: new Date().toISOString(),
    },
    portfolioId,
  );
}

/** Clears obsolete conflict-resolution markers without touching preferences. */
export function clearObsoletePortfolioConflictMarkers(
  userSub: string,
  portfolioId?: string | null,
): void {
  const meta = readPortfolioSyncMeta(userSub, portfolioId);
  if (
    meta.lastResolvedContentFingerprint === undefined &&
    meta.lastSyncError === null
  ) {
    return;
  }
  const {
    lastResolvedContentFingerprint: _,
    ...rest
  } = meta;
  void _;
  writePortfolioSyncMeta(
    userSub,
    {
      ...rest,
      version: PORTFOLIO_SYNC_VERSION,
      lastSyncError: null,
    },
    portfolioId,
  );
}

export function recordSyncFailure(
  userSub: string,
  message: string,
  portfolioId?: string | null,
): void {
  const meta = readPortfolioSyncMeta(userSub, portfolioId);
  writePortfolioSyncMeta(
    userSub,
    {
      ...meta,
      lastSyncError: message,
    },
    portfolioId,
  );
}

export function recordLocalPortfolioSave(
  userSub: string,
  holdings: StoredPortfolioHolding[],
  revision: number,
  portfolioId?: string | null,
): void {
  const summary = summarizePortfolioHoldings(holdings);
  writePortfolioSyncMeta(
    userSub,
    {
      ...readPortfolioSyncMeta(userSub, portfolioId),
      version: PORTFOLIO_SYNC_VERSION,
      lastLocalRevision: revision,
      lastLocalSaveAt: new Date().toISOString(),
      lastLocalInvestmentCount: summary.investments,
      lastLocalTotalCount: summary.total,
      lastSyncError: null,
    },
    portfolioId,
  );

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
  portfolioId?: string | null,
): void {
  writePortfolioSyncMeta(
    userSub,
    {
      ...readPortfolioSyncMeta(userSub, portfolioId),
      version: PORTFOLIO_SYNC_VERSION,
      lastMigrationIdempotencyKey: idempotencyKey,
      lastMigrationFingerprint: fingerprint,
      lastSuccessfulRemoteAt: new Date().toISOString(),
      lastSyncError: null,
    },
    portfolioId,
  );
}
