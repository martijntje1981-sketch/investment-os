"use client";

import { useCallback, useEffect, useState } from "react";

import {
  GOAL_FORM_DEFAULT,
  GOAL_UPDATED_EVENT,
  readSavedUserGoal,
  saveUserGoal,
  shouldHandleGoalUpdatedEvent,
} from "@/lib/client/userGoalStorage";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export function useUserGoal() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [goal, setGoal] = useState<GoalSettings | null>(null);
  const [hasSavedGoal, setHasSavedGoal] = useState(false);
  const [goalReady, setGoalReady] = useState(false);

  const reloadGoal = useCallback(() => {
    if (!userSub) {
      setGoal(null);
      setHasSavedGoal(false);
      return;
    }

    const saved = readSavedUserGoal(userSub);
    setGoal(saved);
    setHasSavedGoal(saved !== null);
  }, [userSub]);

  useEffect(() => {
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
      const detail = (event as CustomEvent<{ userSub?: string }>).detail;
      if (!shouldHandleGoalUpdatedEvent(detail?.userSub, userSub)) return;
      reloadGoal();
    };

    window.addEventListener(GOAL_UPDATED_EVENT, handleGoalUpdated);
    return () => {
      window.removeEventListener(GOAL_UPDATED_EVENT, handleGoalUpdated);
    };
  }, [reloadGoal, userSub]);

  const persistGoal = useCallback(
    (nextGoal: GoalSettings) => {
      if (!userSub) return;
      saveUserGoal(userSub, nextGoal);
      setGoal(nextGoal);
      setHasSavedGoal(true);
    },
    [userSub],
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
