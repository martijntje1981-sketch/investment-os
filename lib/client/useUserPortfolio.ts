"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { markAppEntryCachedPortfolioReady } from "@/lib/client/appEntryPerformanceMarks";
import {
  applyCachedPrices,
  dispatchPortfolioUpdated,
  getLegacyRecoveryOffer,
  loadUserPortfolioHoldings,
  persistVerifiedListingQuoteCorrections,
  recoverLegacyPortfolioToUser,
  dismissLegacyPortfolioRecovery,
  remoteVerifiedListingPricesStale,
  verifiedListingPricesChanged,
  writePortfolioToStorage,
  type LegacyRecoveryOffer,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { syncPortfolioPricesFromSnapshot } from "@/lib/client/marketSnapshotSync";
import { PORTFOLIO_HOLDINGS_UPDATED_EVENT } from "@/lib/client/portfolioStorageKeys";
import { createPortfolioUpdatedHandler } from "@/lib/client/portfolioUpdatedEvents";
import {
  fetchRemotePortfolio,
  migratePortfolioToRemote,
  pushPortfolioToRemote,
} from "@/lib/client/portfolioSyncApi";
import {
  applyRemoteSnapshotToLocalCache,
  clearObsoletePortfolioConflictMarkers,
  markConflictResolutionVerified,
  readPortfolioSyncMeta,
  recordLocalPortfolioSave,
  recordSyncFailure,
  resolveClientSyncState,
  resolveConflictWithPushedSnapshot,
  resolveConflictWithRemoteSnapshot,
  verifyPortfolioSyncAfterReRead,
  recordMigrationSuccess,
  type ClientPortfolioSyncState,
} from "@/lib/client/portfolioSyncState";
import { logPortfolioSyncDiagnostics, logPortfolioPersistenceEvent } from "@/lib/client/portfolioSyncDebug";
import {
  getPortfolioBackupRecoveryOffer,
  restorePortfolioFromBackup,
  writePortfolioBackupIfComplete,
} from "@/lib/client/portfolioLocalBackup";
import {
  buildPortfolioSaveIdempotencyKey,
  summarizePortfolioHoldings,
  validatePortfolioBeforeSave,
} from "@/lib/services/portfolio/portfolioPersistenceGuard";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import { useActivePortfolioOptional } from "@/lib/client/useActivePortfolio";
import { readSavedUserGoal } from "@/lib/client/userGoalStorage";
import { markPortfolioSetupCompleted } from "@/lib/client/portfolioSetup";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";
import {
  buildMigrationIdempotencyKey,
  portfolioFingerprint,
} from "@/lib/services/portfolio/idempotency";
import type { PortfolioSyncPreview } from "@/lib/services/portfolio/types";

let remoteHydrateStartsForTests = 0;

export function __countUserPortfolioRemoteHydratesForTests(): number {
  return remoteHydrateStartsForTests;
}

export function __resetUserPortfolioRemoteHydratesForTests(): void {
  remoteHydrateStartsForTests = 0;
}

function useUserPortfolioState() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const activePortfolio = useActivePortfolioOptional();
  const activePortfolioId = activePortfolio?.activePortfolioId ?? null;
  const isPrimaryBook = activePortfolio?.activePortfolio?.isPrimary ?? true;
  const bookOptions = useMemo(
    () => ({ isPrimary: isPrimaryBook }),
    [isPrimaryBook],
  );
  const bookReady = !activePortfolio || activePortfolio.ready;
  const [holdings, setHoldings] = useState<StoredPortfolioHolding[]>([]);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [recoveryOffer, setRecoveryOffer] =
    useState<LegacyRecoveryOffer | import("@/lib/client/portfolioLocalBackup").PortfolioBackupRecoveryOffer | null>(null);
  const [syncState, setSyncState] = useState<ClientPortfolioSyncState>({
    status: "loading",
  });
  const [migrationPreview, setMigrationPreview] =
    useState<PortfolioSyncPreview | null>(null);

  const remoteHydratedRef = useRef(false);
  const snapshotSyncedRef = useRef(false);
  const holdingsGenerationRef = useRef(0);
  const syncRequestRef = useRef<string | null>(null);
  const saveSequenceRef = useRef(0);
  const saveRequestRef = useRef<{
    sequence: number;
    key: string;
  } | null>(null);

  const reloadPortfolio = useCallback(() => {
    if (!userSub) {
      setHoldings([]);
      setRecoveryOffer(null);
      return;
    }

    setHoldings(loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions));
    setRecoveryOffer(
      getLegacyRecoveryOffer(userSub) ?? getPortfolioBackupRecoveryOffer(userSub),
    );
  }, [activePortfolioId, bookOptions, userSub]);

  const hydrateFromRemote = useCallback(
    async (force = false) => {
      if (!userSub || !bookReady || (!force && remoteHydratedRef.current)) return;
      remoteHydrateStartsForTests += 1;

      setSyncState({ status: "loading" });
      const localHoldings = loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions);
      const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
      const importMappings = readImportMappingsFromCache(userSub);

      if (localHoldings.length > 0) {
        setHoldings(applyCachedPrices(userSub, localHoldings));
        setPortfolioReady(true);
        markAppEntryCachedPortfolioReady();
      }

      const remoteResult = await fetchRemotePortfolio(activePortfolioId);

      if (!remoteResult.ok) {
        if ("unauthorized" in remoteResult && remoteResult.unauthorized) {
          setSyncState({ status: "ready", source: "local" });
          setPortfolioReady(true);
          return;
        }

        const offline =
          "offline" in remoteResult && remoteResult.offline === true;

        const remoteSnapshot = null;

        const nextSyncState = resolveClientSyncState(
          userSub,
          localHoldings,
          remoteSnapshot,
          offline,
          goal,
          importMappings,
        );

        if (localHoldings.length > 0) {
          setHoldings(applyCachedPrices(userSub, localHoldings));
        }

        if (nextSyncState.status === "migration_offer") {
          setMigrationPreview(nextSyncState.preview);
        } else {
          setMigrationPreview(null);
        }

        if (!offline) {
          setSyncState({
            status: "sync_error",
            message:
              "error" in remoteResult
                ? remoteResult.error
                : "Could not reach cloud portfolio. Showing this device copy.",
            retryable: true,
          });
        } else {
          setSyncState(nextSyncState);
        }

        remoteHydratedRef.current = true;
        setPortfolioReady(true);
        setRecoveryOffer(getLegacyRecoveryOffer(userSub));
        return;
      }

      const remoteSnapshot = remoteResult.snapshot;

      const nextSyncState = resolveClientSyncState(
        userSub,
        localHoldings,
        remoteSnapshot,
        false,
        goal,
        importMappings,
      );

      if (
        nextSyncState.status === "ready" &&
        nextSyncState.source === "remote" &&
        remoteSnapshot
      ) {
        const merged = applyRemoteSnapshotToLocalCache(userSub, remoteSnapshot, {
          preserveLocalPrices: localHoldings,
          context: "hydrate",
        });
        setHoldings(merged);
        clearObsoletePortfolioConflictMarkers(userSub);

        if (
          remoteVerifiedListingPricesStale(
            remoteSnapshot.holdings,
            merged,
            userSub,
          )
        ) {
          const meta = readPortfolioSyncMeta(userSub);
          const revision = (meta.lastLocalRevision ?? 0) + 1;
          const idempotencyKey = buildPortfolioSaveIdempotencyKey(
            userSub,
            merged,
            goal,
            revision,
          );
          void pushPortfolioToRemote({
            idempotencyKey,
            holdings: merged,
            goal,
            importMappings,
            portfolioId: activePortfolioId,
          });
        }

        dispatchPortfolioUpdated(userSub);
      } else if (localHoldings.length > 0) {
        setHoldings(applyCachedPrices(userSub, localHoldings));
      }

      if (nextSyncState.status === "migration_offer") {
        setMigrationPreview(nextSyncState.preview);
      } else {
        setMigrationPreview(null);
      }

      setSyncState(nextSyncState);

      remoteHydratedRef.current = true;
      setPortfolioReady(true);
      setRecoveryOffer(getLegacyRecoveryOffer(userSub));
    },
    [activePortfolioId, bookOptions, bookReady, userSub],
  );

  useEffect(() => {
    remoteHydratedRef.current = false;
    snapshotSyncedRef.current = false;
    syncRequestRef.current = null;
    saveRequestRef.current = null;
    saveSequenceRef.current = 0;

    if (!authReady || !bookReady) {
      setHoldings([]);
      setRecoveryOffer(null);
      setPortfolioReady(false);
      setSyncState({ status: "loading" });
      setMigrationPreview(null);
      return;
    }

    if (!userSub) {
      setHoldings([]);
      setRecoveryOffer(null);
      setPortfolioReady(true);
      setSyncState({ status: "ready", source: "local" });
      setMigrationPreview(null);
      return;
    }

    setHoldings(loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions));
    void hydrateFromRemote();
  }, [activePortfolioId, authReady, bookOptions, bookReady, hydrateFromRemote, userSub]);

  useEffect(() => {
    if (!userSub || !portfolioReady || snapshotSyncedRef.current) {
      return;
    }

    const currentHoldings = loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions);
    if (currentHoldings.length === 0) {
      return;
    }

    snapshotSyncedRef.current = true;
    const generationAtStart = holdingsGenerationRef.current;

    void syncPortfolioPricesFromSnapshot(userSub, currentHoldings).then(
      (result) => {
        if (!result.updated) {
          return;
        }

        // A newer local save / live refresh landed while this snapshot sync was
        // in flight — do not clobber React state with the stale closure result.
        if (generationAtStart !== holdingsGenerationRef.current) {
          setHoldings(loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions));
          return;
        }

        if (
          verifiedListingPricesChanged(
            currentHoldings,
            result.holdings,
            userSub,
          )
        ) {
          persistVerifiedListingQuoteCorrections(userSub, result.holdings);
          const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
          const importMappings = readImportMappingsFromCache(userSub);
          const meta = readPortfolioSyncMeta(userSub);
          const revision = (meta.lastLocalRevision ?? 0) + 1;
          const idempotencyKey = buildPortfolioSaveIdempotencyKey(
            userSub,
            result.holdings,
            goal,
            revision,
          );
          void pushPortfolioToRemote({
            idempotencyKey,
            holdings: result.holdings,
            goal,
            importMappings,
            portfolioId: activePortfolioId,
          });
        }

        setHoldings(result.holdings);
      },
    );
  }, [activePortfolioId, bookOptions, portfolioReady, userSub]);

  useEffect(() => {
    if (!userSub) return;

    const handlePortfolioUpdated = createPortfolioUpdatedHandler(
      userSub,
      reloadPortfolio,
    );

    window.addEventListener(
      PORTFOLIO_HOLDINGS_UPDATED_EVENT,
      handlePortfolioUpdated,
    );

    return () => {
      window.removeEventListener(
        PORTFOLIO_HOLDINGS_UPDATED_EVENT,
        handlePortfolioUpdated,
      );
    };
  }, [reloadPortfolio, userSub]);

  const pushRemoteHoldings = useCallback(
    async (
      next: StoredPortfolioHolding[],
      options: { idempotencyKey: string; sequence: number },
    ) => {
      if (!userSub) return;

      const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
      const importMappings = readImportMappingsFromCache(userSub);

      logPortfolioPersistenceEvent("cloud push started", {
        userSub,
        revision: options.sequence,
        idempotencyKey: options.idempotencyKey,
        ...summarizePortfolioHoldings(next),
      });

      const result = await pushPortfolioToRemote({
        idempotencyKey: options.idempotencyKey,
        holdings: next,
        goal,
        importMappings,
        portfolioId: activePortfolioId,
      });

      if (saveRequestRef.current?.sequence !== options.sequence) {
        logPortfolioPersistenceEvent("stale cloud push ignored", {
          userSub,
          revision: options.sequence,
          activeRevision: saveRequestRef.current?.sequence ?? null,
        });
        return;
      }

      if (result.ok) {
        const merged = applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
          preserveLocalPrices: next,
          sentHoldings: next,
          context: "push_response",
        });
        const mergedSummary = summarizePortfolioHoldings(merged);
        const sentSummary = summarizePortfolioHoldings(next);

        if (mergedSummary.investments < sentSummary.investments) {
          logPortfolioSyncDiagnostics("push response rejected as stale", {
            userSub,
            sentInvestments: sentSummary.investments,
            mergedInvestments: mergedSummary.investments,
          });
          setSyncState({
            status: "sync_error",
            message:
              "Cloud sync returned an incomplete portfolio. Your device copy was kept.",
            retryable: true,
          });
          recordSyncFailure(
            userSub,
            "Cloud sync returned an incomplete portfolio.",
          );
          setHoldings(applyCachedPrices(userSub, next));
          return;
        }

        setHoldings(applyCachedPrices(userSub, merged));
        recordSyncFailure(userSub, "");
        logPortfolioPersistenceEvent("cloud push applied", {
          userSub,
          revision: options.sequence,
          ...mergedSummary,
        });
        return;
      }

      if ("unauthorized" in result) return;

      recordSyncFailure(userSub, result.error);
      setSyncState({
        status: "sync_error",
        message: result.error,
        retryable: result.retryable,
      });
    },
    [activePortfolioId, bookOptions, userSub],
  );

  const saveHoldings = useCallback(
    (next: StoredPortfolioHolding[]) => {
      if (!userSub) return;

      const validation = validatePortfolioBeforeSave(next);
      if (!validation.ok) {
        logPortfolioSyncDiagnostics("local save rejected", {
          userSub,
          message: validation.message,
        });
        return;
      }

      const revision =
        Math.max(
          saveSequenceRef.current,
          readPortfolioSyncMeta(userSub).lastLocalRevision ?? 0,
        ) + 1;
      saveSequenceRef.current = revision;

      writePortfolioToStorage(userSub, next);
      writePortfolioBackupIfComplete(userSub, next);
      recordLocalPortfolioSave(userSub, next, revision);
      holdingsGenerationRef.current += 1;
      dispatchPortfolioUpdated(userSub);
      setHoldings(applyCachedPrices(userSub, next));
      if (next.length > 0) {
        markPortfolioSetupCompleted(userSub);
      }
      setRecoveryOffer(
        getLegacyRecoveryOffer(userSub) ?? getPortfolioBackupRecoveryOffer(userSub),
      );

      logPortfolioPersistenceEvent("save holdings", {
        userSub,
        revision,
        ...summarizePortfolioHoldings(next),
      });

      if (
        syncState.status === "conflict" ||
        syncState.status === "migration_offer"
      ) {
        return;
      }

      const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
      const idempotencyKey = buildPortfolioSaveIdempotencyKey(
        userSub,
        next,
        goal,
        revision,
      );
      saveRequestRef.current = { sequence: revision, key: idempotencyKey };

      void pushRemoteHoldings(next, { idempotencyKey, sequence: revision });
    },
    [activePortfolioId, bookOptions, pushRemoteHoldings, syncState.status, userSub],
  );

  useEffect(() => {
    if (!authReady || !userSub) {
      return;
    }

    setHoldings(loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions));
  }, [activePortfolioId, authReady, bookOptions, portfolioReady, userSub]);

  const migratePortfolio = useCallback(async () => {
    if (!userSub || syncRequestRef.current) return false;

    const localHoldings = loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions);
    if (localHoldings.length === 0) return false;

    const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
    const importMappings = readImportMappingsFromCache(userSub);
    const localFingerprint = portfolioFingerprint(localHoldings, userSub);
    const meta = readPortfolioSyncMeta(userSub);
    const idempotencyKey =
      meta.lastMigrationIdempotencyKey ??
      buildMigrationIdempotencyKey(userSub, localFingerprint);

    syncRequestRef.current = idempotencyKey;
    setSyncState({ status: "syncing" });

    const result = await migratePortfolioToRemote({
      idempotencyKey,
      holdings: localHoldings,
      goal,
      importMappings,
      localFingerprint,
    });

    syncRequestRef.current = null;

    if (result.ok && result.verified) {
      const merged = applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
        preserveLocalPrices: localHoldings,
      });
      setHoldings(applyCachedPrices(userSub, merged));
      recordMigrationSuccess(userSub, idempotencyKey, localFingerprint);
      setMigrationPreview(null);
      setSyncState({ status: "ready", source: "remote" });
      dispatchPortfolioUpdated(userSub);
      return true;
    }

    if (!result.ok) {
      if ("unauthorized" in result) {
        setSyncState({
          status: "sync_error",
          message: "Migration failed. Your local portfolio was not changed.",
          retryable: true,
        });
        return false;
      }

      setSyncState({
        status: "sync_error",
        message: result.error,
        retryable: result.retryable,
      });
      return false;
    }

    setSyncState({
      status: "sync_error",
      message: "Migration verification failed. Your local portfolio was not changed.",
      retryable: true,
    });
    return false;
  }, [activePortfolioId, bookOptions, userSub]);

  const retrySync = useCallback(async () => {
    remoteHydratedRef.current = false;
    await hydrateFromRemote(true);
  }, [hydrateFromRemote]);

  const useRemotePortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
    logPortfolioSyncDiagnostics("use cloud portfolio clicked", {
      action: "use_cloud_portfolio",
      localFingerprint: conflict.localFingerprint,
      cloudFingerprint: conflict.remoteFingerprint,
    });

    const resolved = resolveConflictWithRemoteSnapshot(
      userSub,
      conflict.remoteSnapshot,
      conflict.localHoldings,
      goal,
    );

    if (!resolved.ok) {
      recordSyncFailure(userSub, resolved.message);
      setSyncState({
        ...conflict,
        errorMessage: resolved.message,
      });
      return false;
    }

    const verified = await verifyPortfolioSyncAfterReRead(
      userSub,
      () => fetchRemotePortfolio(activePortfolioId),
      activePortfolioId,
      bookOptions.isPrimary,
    );

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
    markConflictResolutionVerified(
      userSub,
      resolved.holdings,
      goalAfterVerify,
      verified.remoteSnapshot,
    );

    setHoldings(applyCachedPrices(userSub, resolved.holdings));
    setSyncState({ status: "ready", source: "remote" });
    dispatchPortfolioUpdated(userSub);
    return true;
  }, [activePortfolioId, bookOptions, syncState, userSub]);

  const keepLocalPortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const localHoldings = loadUserPortfolioHoldings(userSub, activePortfolioId, bookOptions);
    const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
    const importMappings = readImportMappingsFromCache(userSub);

    logPortfolioSyncDiagnostics("keep device copy clicked", {
      action: "keep_device_copy",
      localFingerprint: conflict.localFingerprint,
      cloudFingerprint: conflict.remoteFingerprint,
    });

    const result = await pushPortfolioToRemote({
      idempotencyKey: `conflict-local:${userSub}:${crypto.randomUUID()}`,
      holdings: localHoldings,
      goal,
      importMappings,
      portfolioId: activePortfolioId,
    });

    logPortfolioSyncDiagnostics("keep device copy cloud write", {
      action: "keep_device_copy",
      cloudWriteResult: result.ok ? "ok" : "error",
      cloudWriteError: result.ok ? null : "error" in result ? result.error : "unknown",
    });

    if (!result.ok) {
      const message =
        "error" in result
          ? result.error
          : "Could not upload this device copy to the cloud.";
      recordSyncFailure(userSub, message);
      setSyncState({
        ...conflict,
        errorMessage: message,
      });
      return false;
    }

    const resolved = resolveConflictWithPushedSnapshot(
      userSub,
      result.snapshot,
      localHoldings,
      goal,
    );

    if (!resolved.ok) {
      recordSyncFailure(userSub, resolved.message);
      setSyncState({
        ...conflict,
        errorMessage: resolved.message,
      });
      return false;
    }

    const verified = await verifyPortfolioSyncAfterReRead(
      userSub,
      () => fetchRemotePortfolio(activePortfolioId),
      activePortfolioId,
      bookOptions.isPrimary,
    );

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
    markConflictResolutionVerified(
      userSub,
      resolved.holdings,
      goalAfterVerify,
      verified.remoteSnapshot,
    );

    setHoldings(applyCachedPrices(userSub, resolved.holdings));
    setSyncState({ status: "ready", source: "local" });
    dispatchPortfolioUpdated(userSub);
    return true;
  }, [activePortfolioId, bookOptions, syncState, userSub]);

  const recoverPortfolio = useCallback(() => {
    if (!userSub) return false;
    if (restorePortfolioFromBackup(userSub)) {
      reloadPortfolio();
      return true;
    }
    const recovered = recoverLegacyPortfolioToUser(userSub);
    if (recovered) reloadPortfolio();
    return recovered;
  }, [reloadPortfolio, userSub]);

  const dismissRecovery = useCallback(() => {
    if (!userSub) return;
    dismissLegacyPortfolioRecovery(userSub);
    setRecoveryOffer(null);
  }, [userSub]);

  useEffect(() => {
    if (!userSub || !portfolioReady) return;
    if (holdings.length > 0) {
      markPortfolioSetupCompleted(userSub);
    }
  }, [holdings.length, portfolioReady, userSub]);

  return {
    userSub,
    authReady,
    holdings,
    setHoldings,
    activePortfolioId,
    portfolioReady,
    recoveryOffer,
    syncState,
    migrationPreview,
    reloadPortfolio,
    saveHoldings,
    migratePortfolio,
    retrySync,
    useRemotePortfolio,
    keepLocalPortfolio,
    recoverPortfolio,
    dismissRecovery,
  };
}

type UserPortfolioApi = ReturnType<typeof useUserPortfolioState>;

const UserPortfolioContext = createContext<UserPortfolioApi | null>(null);

export function UserPortfolioProvider({ children }: { children: ReactNode }) {
  const value = useUserPortfolioState();
  return createElement(UserPortfolioContext.Provider, { value }, children);
}

export function useUserPortfolio(): UserPortfolioApi {
  const value = useContext(UserPortfolioContext);
  if (!value) {
    throw new Error("useUserPortfolio must be used within UserPortfolioProvider");
  }
  return value;
}
