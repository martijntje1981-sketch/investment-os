"use client";

import { useMemo } from "react";

import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  buildGoalProgressEngine,
  type GoalProgress,
  type GoalProgressEngineInput,
  type PortfolioHistoryPoint,
} from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function deriveGoalProgress(
  input: GoalProgressEngineInput,
): GoalProgress {
  return buildGoalProgressEngine(input);
}

export function useGoalProgress(input: {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  portfolioHistory?: PortfolioHistoryPoint[];
}): GoalProgress {
  const currentPortfolioValue = useMemo(
    () => buildPortfolioPerformance(input.holdings).totalValue,
    [input.holdings],
  );

  return useMemo(
    () =>
      buildGoalProgressEngine({
        currentPortfolioValue,
        goal: input.goal,
        hasSavedGoal: input.hasSavedGoal,
        portfolioHistory: input.portfolioHistory,
      }),
    [
      currentPortfolioValue,
      input.goal,
      input.hasSavedGoal,
      input.portfolioHistory,
    ],
  );
}
