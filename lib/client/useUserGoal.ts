"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GOAL_FORM_DEFAULT,
  GOAL_UPDATED_EVENT,
  readSavedUserGoal,
  saveUserGoal,
  shouldHandleGoalUpdatedEvent,
} from "@/lib/client/userGoalStorage";
import { loadUserPortfolioHoldings } from "@/lib/client/portfolioPricing";
import { getOrCreateSyncClientId, pushPortfolioToRemote } from "@/lib/client/portfolioSyncApi";
import { applyRemoteSnapshotToLocalCache, readPortfolioSyncMeta } from "@/lib/client/portfolioSyncState";
import { shouldApplyAsyncBookResult } from "@/lib/client/portfolioBookGuard";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import { useActivePortfolioOptional } from "@/lib/client/useActivePortfolio";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export function useUserGoal() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const activePortfolio = useActivePortfolioOptional();
  const activePortfolioId = activePortfolio?.activePortfolioId ?? null;
  const isPrimaryBook = activePortfolio?.activePortfolio?.isPrimary ?? true;
  const [goal, setGoal] = useState<GoalSettings | null>(null);
  const [hasSavedGoal, setHasSavedGoal] = useState(false);
  const [goalReady, setGoalReady] = useState(false);
  const activePortfolioIdRef = useRef(activePortfolioId);
  activePortfolioIdRef.current = activePortfolioId;
  const goalEpochRef = useRef(0);
  const saveRequestRef = useRef<string | null>(null);

  const reloadGoal = useCallback(() => {
    if (!userSub) {
      setGoal(null);
      setHasSavedGoal(false);
      return;
    }

    const saved = readSavedUserGoal(userSub, activePortfolioId, {
      isPrimary: isPrimaryBook,
    });
    setGoal(saved);
    setHasSavedGoal(saved !== null);
  }, [activePortfolioId, isPrimaryBook, userSub]);

  useEffect(() => {
    goalEpochRef.current += 1;
    if (!authReady) {
      setGoal(null);
      setHasSavedGoal(false);
      setGoalReady(false);
      return;
    }

    if (!userSub) {
      setGoal(null);
      setHasSavedGoal(false);
      setGoalReady(true);
      return;
    }

    reloadGoal();
    setGoalReady(true);
  }, [authReady, reloadGoal, userSub]);

  useEffect(() => {
    if (!userSub) return;

    const handleGoalUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userSub?: string; portfolioId?: string | null }>).detail;
      if (
        !shouldHandleGoalUpdatedEvent(
          detail?.userSub,
          userSub,
          detail?.portfolioId,
          activePortfolioId,
        )
      )
        return;
      reloadGoal();
    };

    window.addEventListener(GOAL_UPDATED_EVENT, handleGoalUpdated);
    return () => {
      window.removeEventListener(GOAL_UPDATED_EVENT, handleGoalUpdated);
    };
  }, [activePortfolioId, reloadGoal, userSub]);

  const persistGoal = useCallback(
    (nextGoal: GoalSettings) => {
      if (!userSub) return;
      saveUserGoal(userSub, nextGoal, activePortfolioId, {
        isPrimary: isPrimaryBook,
      });
      setGoal(nextGoal);
      setHasSavedGoal(true);

      const persistBookId = activePortfolioId;
      const persistEpoch = goalEpochRef.current;
      const saveKey = saveRequestRef.current ?? crypto.randomUUID();
      saveRequestRef.current = saveKey;
      const baseVersion = readPortfolioSyncMeta(userSub, persistBookId)
        .lastHydratedSyncVersion;
      if (typeof baseVersion !== "number") {
        return;
      }

      void pushPortfolioToRemote({
        idempotencyKey: `goal:${userSub}:${saveKey}`,
        holdings: loadUserPortfolioHoldings(userSub, persistBookId, {
          isPrimary: isPrimaryBook,
        }),
        goal: nextGoal,
        importMappings: readImportMappingsFromCache(userSub),
        portfolioId: persistBookId,
        baseVersion,
        clientId: getOrCreateSyncClientId(),
      }).then((result) => {
        if (saveRequestRef.current !== saveKey) return;
        if (
          !shouldApplyAsyncBookResult({
            activePortfolioId: activePortfolioIdRef.current,
            requestPortfolioId: persistBookId,
            responsePortfolioId: result.ok ? result.snapshot.portfolioId : null,
            requestEpoch: persistEpoch,
            activeEpoch: goalEpochRef.current,
          }).apply
        ) {
          return;
        }
        saveRequestRef.current = null;
        if (result.ok) {
          applyRemoteSnapshotToLocalCache(userSub, result.snapshot);
        }
      });
    },
    [activePortfolioId, isPrimaryBook, userSub],
  );

  return {
    userSub,
    authReady,
    goal,
    hasSavedGoal,
    goalReady,
    reloadGoal,
    persistGoal,
  };
}

export type { GoalSettings };
export { GOAL_FORM_DEFAULT };
