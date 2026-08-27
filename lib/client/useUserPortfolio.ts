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
  getOrCreateSyncClientId,
  migratePortfolioToRemote,
  pushPortfolioToRemote,
} from "@/lib/client/portfolioSyncApi";
import {
  applyRemoteSnapshotToLocalCache,
  clearObsoletePortfolioConflictMarkers,
  markConflictResolutionVerified,
  readPortfolioSyncMeta,
  recordCloudHydrate,
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
import { targetBookHasRequestedHoldings } from "@/lib/services/portfolio/holdingUniqueness";
import type { PortfolioSyncPreview } from "@/lib/services/portfolio/types";
import {
  recordHydratedVersionForBook,
  resolveHydratedVersionForActiveBook,
  shouldApplyAsyncBookResult,
} from "@/lib/client/portfolioBookGuard";

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
  const activePortfolioIdRef = useRef(activePortfolioId);
  activePortfolioIdRef.current = activePortfolioId;
  const bookEpochRef = useRef(0);
  const hydratedVersionByBookRef = useRef(new Map<string, number>());
  const hydrateEpochByBookRef = useRef(new Map<string, number>());
  const saveRequestRef = useRef<{
    sequence: number;
    key: string;
    portfolioId: string | null;
    epoch: number;
  } | null>(null);

  function isLiveBookWork(
    requestPortfolioId: string | null | undefined,
    requestEpoch: number,
    responsePortfolioId?: string | null,
  ): boolean {
    return shouldApplyAsyncBookResult({
      activePortfolioId: activePortfolioIdRef.current,
      requestPortfolioId,
      responsePortfolioId,
      requestEpoch,
      activeEpoch: bookEpochRef.current,
    }).apply;
  }

  function liveHydratedVersion(): number | null {
    return resolveHydratedVersionForActiveBook({
      activePortfolioId: activePortfolioIdRef.current,
      versionsByBook: hydratedVersionByBookRef.current,
      hydrateEpochByBook: hydrateEpochByBookRef.current,
      activeEpoch: bookEpochRef.current,
    });
  }

  function storeHydratedVersion(
    requestPortfolioId: string | null | undefined,
    responsePortfolioId: string | null | undefined,
    version: number,
    epoch: number,
  ): void {
    recordHydratedVersionForBook(
      hydratedVersionByBookRef.current,
      hydrateEpochByBookRef.current,
      {
        requestPortfolioId,
        responsePortfolioId,
        version,
        epoch,
      },
    );
  }

  function bumpBookEpoch(): number {
    bookEpochRef.current += 1;
    remoteHydratedRef.current = false;
    snapshotSyncedRef.current = false;
    syncRequestRef.current = null;
    saveRequestRef.current = null;
    saveSequenceRef.current = 0;
    return bookEpochRef.current;
  }

  useEffect(() => {
    hydratedVersionByBookRef.current = new Map();
    hydrateEpochByBookRef.current = new Map();
  }, [userSub]);

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

      const requestPortfolioId = activePortfolioId;
      const requestEpoch = bookEpochRef.current;

      setSyncState({ status: "loading" });
      const localHoldings = loadUserPortfolioHoldings(userSub, requestPortfolioId, bookOptions);
      const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
      const importMappings = readImportMappingsFromCache(userSub);

      if (localHoldings.length > 0 && isLiveBookWork(requestPortfolioId, requestEpoch)) {
        setHoldings(applyCachedPrices(userSub, localHoldings));
        setPortfolioReady(true);
        markAppEntryCachedPortfolioReady();
      }

      const remoteResult = await fetchRemotePortfolio(requestPortfolioId);

      if (!isLiveBookWork(requestPortfolioId, requestEpoch, remoteResult.ok ? remoteResult.snapshot.portfolioId : null)) {
        return;
      }

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
      const hydratedVersion =
        typeof remoteSnapshot.syncVersion === "number"
          ? remoteSnapshot.syncVersion
          : 0;
      storeHydratedVersion(
        requestPortfolioId,
        remoteSnapshot.portfolioId,
        hydratedVersion,
        requestEpoch,
      );
      recordCloudHydrate(userSub, remoteSnapshot);

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
        if (!isLiveBookWork(requestPortfolioId, requestEpoch, remoteSnapshot.portfolioId)) {
          return;
        }
        setHoldings(merged);
        clearObsoletePortfolioConflictMarkers(userSub, requestPortfolioId);

        if (
          remoteVerifiedListingPricesStale(
            remoteSnapshot.holdings,
            merged,
            userSub,
          ) &&
          isLiveBookWork(requestPortfolioId, requestEpoch, remoteSnapshot.portfolioId)
        ) {
          const meta = readPortfolioSyncMeta(userSub, requestPortfolioId);
          const revision = (meta.lastLocalRevision ?? 0) + 1;
          const idempotencyKey = buildPortfolioSaveIdempotencyKey(
            userSub,
            merged,
            goal,
            revision,
            requestPortfolioId,
          );
          const baseVersion = liveHydratedVersion();
          if (baseVersion != null) {
            void pushPortfolioToRemote({
              idempotencyKey,
              holdings: merged,
              goal,
              importMappings,
              portfolioId: requestPortfolioId,
              baseVersion,
              clientId: getOrCreateSyncClientId(),
            });
          }
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
    bumpBookEpoch();

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

    const requestPortfolioId = activePortfolioId;
    const requestEpoch = bookEpochRef.current;
    const currentHoldings = loadUserPortfolioHoldings(userSub, requestPortfolioId, bookOptions);
    if (currentHoldings.length === 0) {
      return;
    }

    snapshotSyncedRef.current = true;
    const generationAtStart = holdingsGenerationRef.current;

    void syncPortfolioPricesFromSnapshot(userSub, currentHoldings).then(
      (result) => {
        if (!isLiveBookWork(requestPortfolioId, requestEpoch)) {
          return;
        }

        if (!result.updated) {
          return;
        }

        // A newer local save / live refresh landed while this snapshot sync was
        // in flight — do not clobber React state with the stale closure result.
        if (generationAtStart !== holdingsGenerationRef.current) {
          if (!isLiveBookWork(requestPortfolioId, requestEpoch)) {
            return;
          }
          setHoldings(loadUserPortfolioHoldings(userSub, requestPortfolioId, bookOptions));
          return;
        }

        if (
          verifiedListingPricesChanged(
            currentHoldings,
            result.holdings,
            userSub,
          )
        ) {
          persistVerifiedListingQuoteCorrections(
            userSub,
            result.holdings,
            requestPortfolioId,
            bookOptions,
          );
          const baseVersion = liveHydratedVersion();
          if (baseVersion == null) {
            if (isLiveBookWork(requestPortfolioId, requestEpoch)) {
              setHoldings(result.holdings);
            }
            return;
          }
          if (!isLiveBookWork(requestPortfolioId, requestEpoch)) {
            return;
          }
          const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
          const importMappings = readImportMappingsFromCache(userSub);
          const meta = readPortfolioSyncMeta(userSub, requestPortfolioId);
          const revision = (meta.lastLocalRevision ?? 0) + 1;
          const idempotencyKey = buildPortfolioSaveIdempotencyKey(
            userSub,
            result.holdings,
            goal,
            revision,
            requestPortfolioId,
          );
          void pushPortfolioToRemote({
            idempotencyKey,
            holdings: result.holdings,
            goal,
            importMappings,
            portfolioId: requestPortfolioId,
            baseVersion,
            clientId: getOrCreateSyncClientId(),
          });
        }

        if (isLiveBookWork(requestPortfolioId, requestEpoch)) {
          setHoldings(result.holdings);
        }
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

      const requestPortfolioId = activePortfolioId;
      const requestEpoch = bookEpochRef.current;
      const baseVersion = liveHydratedVersion();
      const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
      const importMappings = readImportMappingsFromCache(userSub);

      logPortfolioPersistenceEvent("cloud push started", {
        userSub,
        revision: options.sequence,
        idempotencyKey: options.idempotencyKey,
        ...summarizePortfolioHoldings(next),
      });

      if (baseVersion == null) {
        logPortfolioPersistenceEvent("cloud push blocked until hydrate", {
          userSub,
          revision: options.sequence,
        });
        return;
      }

      const result = await pushPortfolioToRemote({
        idempotencyKey: options.idempotencyKey,
        holdings: next,
        goal,
        importMappings,
        portfolioId: requestPortfolioId,
        baseVersion,
        clientId: getOrCreateSyncClientId(),
      });

      const responsePortfolioId = result.ok
        ? result.snapshot.portfolioId
        : "snapshot" in result
          ? result.snapshot?.portfolioId
          : null;

      if (!isLiveBookWork(requestPortfolioId, requestEpoch, responsePortfolioId)) {
        logPortfolioPersistenceEvent("stale cloud push ignored", {
          userSub,
          revision: options.sequence,
          activeRevision: saveRequestRef.current?.sequence ?? null,
        });
        return;
      }

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
        if (typeof result.snapshot.syncVersion === "number") {
          storeHydratedVersion(
            requestPortfolioId,
            result.snapshot.portfolioId,
            result.snapshot.syncVersion,
            requestEpoch,
          );
        }
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
            requestPortfolioId,
          );
          setHoldings(applyCachedPrices(userSub, next));
          return;
        }

        setHoldings(applyCachedPrices(userSub, merged));
        recordSyncFailure(userSub, "", requestPortfolioId);
        setSyncState({ status: "ready", source: "remote" });
        setMigrationPreview(null);
        logPortfolioPersistenceEvent("cloud push applied", {
          userSub,
          revision: options.sequence,
          ...mergedSummary,
        });
        return;
      }

      if ("unauthorized" in result) return;

      if (result.staleVersion && result.snapshot) {
        if (!isLiveBookWork(requestPortfolioId, requestEpoch, result.snapshot.portfolioId)) {
          return;
        }
        const merged = applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
          preserveLocalPrices: next,
          context: "hydrate",
        });
        const nextVersion =
          typeof result.snapshot.syncVersion === "number"
            ? result.snapshot.syncVersion
            : baseVersion;
        storeHydratedVersion(
          requestPortfolioId,
          result.snapshot.portfolioId,
          nextVersion,
          requestEpoch,
        );
        setHoldings(applyCachedPrices(userSub, merged));
        setSyncState({ status: "ready", source: "remote" });
        logPortfolioPersistenceEvent("stale version rejected; rehydrated", {
          userSub,
          revision: options.sequence,
          syncVersion: result.snapshot.syncVersion,
        });
        return;
      }

      if (result.code === "23505" && requestPortfolioId) {
        const remote = await fetchRemotePortfolio(requestPortfolioId);
        if (!isLiveBookWork(requestPortfolioId, requestEpoch, remote.ok ? remote.snapshot.portfolioId : null)) {
          return;
        }
        if (
          remote.ok &&
          targetBookHasRequestedHoldings(next, remote.snapshot.holdings)
        ) {
          const merged = applyRemoteSnapshotToLocalCache(userSub, remote.snapshot, {
            preserveLocalPrices: next,
            sentHoldings: next,
            context: "push_response",
          });
          setHoldings(applyCachedPrices(userSub, merged));
          recordSyncFailure(userSub, "", requestPortfolioId);
          setSyncState({ status: "ready", source: "remote" });
          setMigrationPreview(null);
          logPortfolioPersistenceEvent("cloud push unique conflict reconciled", {
            userSub,
            revision: options.sequence,
            ...summarizePortfolioHoldings(merged),
          });
          return;
        }
      }

      recordSyncFailure(userSub, result.error, requestPortfolioId);
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
          readPortfolioSyncMeta(userSub, activePortfolioId).lastLocalRevision ?? 0,
        ) + 1;
      saveSequenceRef.current = revision;

      writePortfolioToStorage(userSub, next, activePortfolioId, bookOptions);
      writePortfolioBackupIfComplete(userSub, next);
      recordLocalPortfolioSave(userSub, next, revision, activePortfolioId);
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
        syncState.status === "migration_offer" ||
        liveHydratedVersion() == null
      ) {
        return;
      }

      const goal = readSavedUserGoal(userSub, activePortfolioId, bookOptions);
      const idempotencyKey = buildPortfolioSaveIdempotencyKey(
        userSub,
        next,
        goal,
        revision,
        activePortfolioId,
      );
      saveRequestRef.current = {
        sequence: revision,
        key: idempotencyKey,
        portfolioId: activePortfolioId,
        epoch: bookEpochRef.current,
      };

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

    const requestPortfolioId = activePortfolioId;
    const requestEpoch = bookEpochRef.current;
    const localHoldings = loadUserPortfolioHoldings(userSub, requestPortfolioId, bookOptions);
    if (localHoldings.length === 0) return false;

    const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
    const importMappings = readImportMappingsFromCache(userSub);
    const localFingerprint = portfolioFingerprint(localHoldings, userSub);
    const meta = readPortfolioSyncMeta(userSub, requestPortfolioId);
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

    if (!isLiveBookWork(requestPortfolioId, requestEpoch, result.ok ? result.snapshot.portfolioId : null)) {
      return false;
    }

    syncRequestRef.current = null;

    if (result.ok && result.verified) {
      const merged = applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
        preserveLocalPrices: localHoldings,
      });
      if (typeof result.snapshot.syncVersion === "number") {
        storeHydratedVersion(
          requestPortfolioId,
          result.snapshot.portfolioId,
          result.snapshot.syncVersion,
          requestEpoch,
        );
      }
      setHoldings(applyCachedPrices(userSub, merged));
      recordMigrationSuccess(
        userSub,
        idempotencyKey,
        localFingerprint,
        requestPortfolioId,
      );
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
    bumpBookEpoch();
    if (!userSub || !activePortfolioId) {
      remoteHydratedRef.current = false;
      await hydrateFromRemote(true);
      return;
    }

    const requestPortfolioId = activePortfolioId;
    const requestEpoch = bookEpochRef.current;
    const localHoldings = loadUserPortfolioHoldings(
      userSub,
      requestPortfolioId,
      bookOptions,
    );
    const remoteResult = await fetchRemotePortfolio(requestPortfolioId);

    if (!isLiveBookWork(requestPortfolioId, requestEpoch, remoteResult.ok ? remoteResult.snapshot.portfolioId : null)) {
      return;
    }

    if (remoteResult.ok) {
      const hydratedVersion =
        typeof remoteResult.snapshot.syncVersion === "number"
          ? remoteResult.snapshot.syncVersion
          : 0;
      storeHydratedVersion(
        requestPortfolioId,
        remoteResult.snapshot.portfolioId,
        hydratedVersion,
        requestEpoch,
      );
      recordCloudHydrate(userSub, remoteResult.snapshot);
      const merged = applyRemoteSnapshotToLocalCache(userSub, remoteResult.snapshot, {
        preserveLocalPrices: localHoldings,
        context: "hydrate",
      });
      setHoldings(applyCachedPrices(userSub, merged));
      recordSyncFailure(userSub, "", requestPortfolioId);
      setSyncState({ status: "ready", source: "remote" });
      setMigrationPreview(null);
      return;
    }

    if (localHoldings.length > 0) {
      setSyncState({
        status: "sync_error",
        message:
          "error" in remoteResult
            ? remoteResult.error
            : "Could not reach cloud portfolio. This device copy was kept as cache.",
        retryable: true,
      });
      return;
    }

    remoteHydratedRef.current = false;
    await hydrateFromRemote(true);
  }, [
    activePortfolioId,
    bookOptions,
    hydrateFromRemote,
    pushRemoteHoldings,
    userSub,
  ]);

  const useRemotePortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const requestPortfolioId = activePortfolioId;
    const requestEpoch = bookEpochRef.current;
    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
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
      if (!isLiveBookWork(requestPortfolioId, requestEpoch)) return false;
      recordSyncFailure(userSub, resolved.message, requestPortfolioId);
      setSyncState({
        ...conflict,
        errorMessage: resolved.message,
      });
      return false;
    }

    const verified = await verifyPortfolioSyncAfterReRead(
      userSub,
      () => fetchRemotePortfolio(requestPortfolioId),
      requestPortfolioId,
      bookOptions.isPrimary,
    );

    if (!isLiveBookWork(requestPortfolioId, requestEpoch, verified.ok ? verified.remoteSnapshot.portfolioId : null)) {
      return false;
    }

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message, requestPortfolioId);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
    markConflictResolutionVerified(
      userSub,
      resolved.holdings,
      goalAfterVerify,
      verified.remoteSnapshot,
    );
    if (typeof verified.remoteSnapshot.syncVersion === "number") {
      storeHydratedVersion(
        requestPortfolioId,
        verified.remoteSnapshot.portfolioId,
        verified.remoteSnapshot.syncVersion,
        requestEpoch,
      );
    }

    setHoldings(applyCachedPrices(userSub, resolved.holdings));
    setSyncState({ status: "ready", source: "remote" });
    dispatchPortfolioUpdated(userSub);
    return true;
  }, [activePortfolioId, bookOptions, syncState, userSub]);

  const keepLocalPortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const requestPortfolioId = activePortfolioId;
    const requestEpoch = bookEpochRef.current;
    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const localHoldings = loadUserPortfolioHoldings(userSub, requestPortfolioId, bookOptions);
    const goal = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
    const importMappings = readImportMappingsFromCache(userSub);

    logPortfolioSyncDiagnostics("keep device copy clicked", {
      action: "keep_device_copy",
      localFingerprint: conflict.localFingerprint,
      cloudFingerprint: conflict.remoteFingerprint,
    });

    const keepBaseVersion = liveHydratedVersion();
    if (keepBaseVersion == null) {
      recordSyncFailure(
        userSub,
        "Cloud portfolio must load before this device copy can be uploaded.",
        requestPortfolioId,
      );
      setSyncState({
        ...conflict,
        errorMessage:
          "Cloud portfolio must load before this device copy can be uploaded.",
      });
      return false;
    }

    const result = await pushPortfolioToRemote({
      idempotencyKey: `conflict-local:${userSub}:${crypto.randomUUID()}`,
      holdings: localHoldings,
      goal,
      importMappings,
      portfolioId: requestPortfolioId,
      baseVersion: keepBaseVersion,
      clientId: getOrCreateSyncClientId(),
    });

    if (!isLiveBookWork(requestPortfolioId, requestEpoch, result.ok ? result.snapshot.portfolioId : "snapshot" in result ? result.snapshot?.portfolioId : null)) {
      return false;
    }

    logPortfolioSyncDiagnostics("keep device copy cloud write", {
      action: "keep_device_copy",
      cloudWriteResult: result.ok ? "ok" : "error",
      cloudWriteError: result.ok ? null : "error" in result ? result.error : "unknown",
    });

    if (!result.ok) {
      if (result.staleVersion && result.snapshot) {
        if (!isLiveBookWork(requestPortfolioId, requestEpoch, result.snapshot.portfolioId)) {
          return false;
        }
        const merged = applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
          preserveLocalPrices: localHoldings,
          context: "hydrate",
        });
        const nextVersion =
          typeof result.snapshot.syncVersion === "number"
            ? result.snapshot.syncVersion
            : keepBaseVersion;
        storeHydratedVersion(
          requestPortfolioId,
          result.snapshot.portfolioId,
          nextVersion,
          requestEpoch,
        );
        recordCloudHydrate(userSub, result.snapshot);
        setHoldings(applyCachedPrices(userSub, merged));
        setSyncState({ status: "ready", source: "remote" });
        return false;
      }
      const message =
        "error" in result
          ? result.error
          : "Could not upload this device copy to the cloud.";
      recordSyncFailure(userSub, message, requestPortfolioId);
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
      recordSyncFailure(userSub, resolved.message, requestPortfolioId);
      setSyncState({
        ...conflict,
        errorMessage: resolved.message,
      });
      return false;
    }

    const verified = await verifyPortfolioSyncAfterReRead(
      userSub,
      () => fetchRemotePortfolio(requestPortfolioId),
      requestPortfolioId,
      bookOptions.isPrimary,
    );

    if (!isLiveBookWork(requestPortfolioId, requestEpoch, verified.ok ? verified.remoteSnapshot.portfolioId : null)) {
      return false;
    }

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message, requestPortfolioId);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub, requestPortfolioId, bookOptions);
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
