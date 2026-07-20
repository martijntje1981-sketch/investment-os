"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCachedPrices,
  dispatchPortfolioUpdated,
  getLegacyRecoveryOffer,
  loadUserPortfolioHoldings,
  recoverLegacyPortfolioToUser,
  dismissLegacyPortfolioRecovery,
  tryRefreshPortfolioPrices,
  writePortfolioToStorage,
  type LegacyRecoveryOffer,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { PORTFOLIO_HOLDINGS_UPDATED_EVENT } from "@/lib/client/portfolioStorageKeys";
import { createPortfolioUpdatedHandler } from "@/lib/client/portfolioUpdatedEvents";
import {
  fetchRemotePortfolio,
  migratePortfolioToRemote,
  pushPortfolioToRemote,
} from "@/lib/client/portfolioSyncApi";
import {
  applyRemoteSnapshotToLocalCache,
  markConflictResolutionVerified,
  resolveConflictWithPushedSnapshot,
  resolveConflictWithRemoteSnapshot,
  verifyPortfolioSyncAfterReRead,
  type ClientPortfolioSyncState,
  readPortfolioSyncMeta,
  recordMigrationSuccess,
  recordSyncFailure,
  resolveClientSyncState,
} from "@/lib/client/portfolioSyncState";
import { logPortfolioSyncDiagnostics } from "@/lib/client/portfolioSyncDebug";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import { readSavedUserGoal } from "@/lib/client/userGoalStorage";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";
import {
  buildMigrationIdempotencyKey,
  portfolioFingerprint,
} from "@/lib/services/portfolio/idempotency";
import type { PortfolioSyncPreview } from "@/lib/services/portfolio/types";

export function useUserPortfolio() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [holdings, setHoldings] = useState<StoredPortfolioHolding[]>([]);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [recoveryOffer, setRecoveryOffer] =
    useState<LegacyRecoveryOffer | null>(null);
  const [syncState, setSyncState] = useState<ClientPortfolioSyncState>({
    status: "loading",
  });
  const [migrationPreview, setMigrationPreview] =
    useState<PortfolioSyncPreview | null>(null);

  const remoteHydratedRef = useRef(false);
  const syncRequestRef = useRef<string | null>(null);
  const saveRequestRef = useRef<{ key: string } | null>(null);

  const reloadPortfolio = useCallback(() => {
    if (!userSub) {
      setHoldings([]);
      setRecoveryOffer(null);
      return;
    }

    setHoldings(loadUserPortfolioHoldings(userSub));
    setRecoveryOffer(getLegacyRecoveryOffer(userSub));
  }, [userSub]);

  const hydrateFromRemote = useCallback(
    async (force = false) => {
      if (!userSub || (!force && remoteHydratedRef.current)) return;

      setSyncState({ status: "loading" });
      const localHoldings = loadUserPortfolioHoldings(userSub);
      const goal = readSavedUserGoal(userSub);
      const importMappings = readImportMappingsFromCache(userSub);

      if (localHoldings.length > 0) {
        setHoldings(applyCachedPrices(userSub, localHoldings));
        setPortfolioReady(true);
      }

      const remoteResult = await fetchRemotePortfolio();

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
        });
        setHoldings(applyCachedPrices(userSub, merged));
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
    [userSub],
  );

  useEffect(() => {
    remoteHydratedRef.current = false;
    syncRequestRef.current = null;
    saveRequestRef.current = null;

    if (!authReady) {
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

    void hydrateFromRemote();
  }, [authReady, hydrateFromRemote, userSub]);

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
    async (next: StoredPortfolioHolding[]) => {
      if (!userSub) return;

      const saveKey =
        saveRequestRef.current?.key ?? crypto.randomUUID();
      saveRequestRef.current = { key: saveKey };

      const goal = readSavedUserGoal(userSub);
      const importMappings = readImportMappingsFromCache(userSub);

      const result = await pushPortfolioToRemote({
        idempotencyKey: `save:${userSub}:${saveKey}`,
        holdings: next,
        goal,
        importMappings,
      });

      if (saveRequestRef.current?.key !== saveKey) return;

      if (result.ok) {
        applyRemoteSnapshotToLocalCache(userSub, result.snapshot, {
          preserveLocalPrices: next,
        });
        recordSyncFailure(userSub, "");
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
    [userSub],
  );

  const saveHoldings = useCallback(
    (next: StoredPortfolioHolding[]) => {
      if (!userSub) return;

      writePortfolioToStorage(userSub, next);
      dispatchPortfolioUpdated(userSub);
      setHoldings(applyCachedPrices(userSub, next));
      setRecoveryOffer(getLegacyRecoveryOffer(userSub));

      if (
        syncState.status === "conflict" ||
        syncState.status === "migration_offer"
      ) {
        return;
      }

      void pushRemoteHoldings(next);
    },
    [pushRemoteHoldings, syncState.status, userSub],
  );

  useEffect(() => {
    if (!authReady || !userSub || !portfolioReady || holdings.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshPrices = async () => {
      const current = loadUserPortfolioHoldings(userSub);
      if (current.length === 0 || cancelled) {
        return;
      }

      const result = await tryRefreshPortfolioPrices(userSub, current);
      if (cancelled || !result.updated) {
        return;
      }

      saveHoldings(result.holdings);
    };

    void refreshPrices();

    const handleRefresh = () => {
      void refreshPrices();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [authReady, holdings.length, portfolioReady, saveHoldings, userSub]);

  const migratePortfolio = useCallback(async () => {
    if (!userSub || syncRequestRef.current) return false;

    const localHoldings = loadUserPortfolioHoldings(userSub);
    if (localHoldings.length === 0) return false;

    const goal = readSavedUserGoal(userSub);
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
  }, [userSub]);

  const retrySync = useCallback(async () => {
    remoteHydratedRef.current = false;
    await hydrateFromRemote(true);
  }, [hydrateFromRemote]);

  const useRemotePortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const goal = readSavedUserGoal(userSub);
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
      fetchRemotePortfolio,
    );

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub);
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
  }, [syncState, userSub]);

  const keepLocalPortfolio = useCallback(async () => {
    if (!userSub || syncState.status !== "conflict") return false;

    const conflict = syncState;
    setSyncState({ status: "syncing" });

    const localHoldings = loadUserPortfolioHoldings(userSub);
    const goal = readSavedUserGoal(userSub);
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
      fetchRemotePortfolio,
    );

    if (!verified.ok) {
      recordSyncFailure(userSub, verified.message);
      setSyncState({
        ...conflict,
        errorMessage: verified.message,
      });
      return false;
    }

    const goalAfterVerify = readSavedUserGoal(userSub);
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
  }, [syncState, userSub]);

  const recoverPortfolio = useCallback(() => {
    if (!userSub) return false;
    const recovered = recoverLegacyPortfolioToUser(userSub);
    if (recovered) reloadPortfolio();
    return recovered;
  }, [reloadPortfolio, userSub]);

  const dismissRecovery = useCallback(() => {
    if (!userSub) return;
    dismissLegacyPortfolioRecovery(userSub);
    setRecoveryOffer(null);
  }, [userSub]);

  return {
    userSub,
    authReady,
    holdings,
    setHoldings,
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
