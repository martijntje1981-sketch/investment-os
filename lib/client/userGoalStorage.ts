/**
 * Central user-scoped goal persistence and update events.
 */

import {
  annualContributionKey,
  assertUserSub,
  goalStorageKey,
  isValidUserSub,
} from "@/lib/client/portfolioStorageKeys";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export const GOAL_UPDATED_EVENT = "investment-os-goal-updated";

/** Form defaults only — never treated as a saved user goal. */
export const GOAL_FORM_DEFAULT: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2036,
  monthlyContribution: 1_250,
  expectedAnnualReturn: 10,
};

function normalizeGoal(parsed: Partial<GoalSettings>): GoalSettings | null {
  const targetValue = Number(parsed.targetValue);
  const targetYear = Number(parsed.targetYear);
  const monthlyContribution = Number(parsed.monthlyContribution);
  const expectedAnnualReturn = Number(parsed.expectedAnnualReturn);

  if (
    !Number.isFinite(targetValue) ||
    targetValue <= 0 ||
    !Number.isFinite(targetYear) ||
    targetYear < new Date().getFullYear() ||
    !Number.isFinite(monthlyContribution) ||
    monthlyContribution < 0 ||
    !Number.isFinite(expectedAnnualReturn) ||
    expectedAnnualReturn < 0
  ) {
    return null;
  }

  return {
    targetValue,
    targetYear,
    monthlyContribution,
    expectedAnnualReturn,
  };
}

export function readSavedUserGoal(userSub: string): GoalSettings | null {
  assertUserSub(userSub);

  try {
    const stored = localStorage.getItem(goalStorageKey(userSub));
    if (!stored) return null;
    return normalizeGoal(JSON.parse(stored) as Partial<GoalSettings>);
  } catch {
    return null;
  }
}

export function writeUserGoal(userSub: string, goal: GoalSettings): void {
  assertUserSub(userSub);
  localStorage.setItem(goalStorageKey(userSub), JSON.stringify(goal));
  localStorage.setItem(
    annualContributionKey(userSub),
    String(goal.monthlyContribution * 12),
  );
}

export function dispatchGoalUpdated(userSub: string): void {
  assertUserSub(userSub);
  window.dispatchEvent(
    new CustomEvent(GOAL_UPDATED_EVENT, {
      detail: { userSub },
    }),
  );
}

export function saveUserGoal(userSub: string, goal: GoalSettings): void {
  writeUserGoal(userSub, goal);
  dispatchGoalUpdated(userSub);
}

export function computeGoalProgress(
  portfolioValue: number,
  goal: GoalSettings,
): number {
  if (goal.targetValue <= 0) return 0;
  return Math.min((portfolioValue / goal.targetValue) * 100, 100);
}

export function isGoalAchieved(
  portfolioValue: number,
  goal: GoalSettings,
): boolean {
  return goal.targetValue > 0 && portfolioValue >= goal.targetValue;
}

export function resolveGoalMissionTitle(
  goal: GoalSettings | null,
  hasSavedGoal: boolean,
): string {
  if (!hasSavedGoal || !goal) {
    return "Set your financial goal";
  }

  return `Track your ${formatGoalCurrency(goal.targetValue)} goal`;
}

export function formatGoalCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function shouldHandleGoalUpdatedEvent(
  eventUserSub: string | undefined,
  currentUserSub: string,
): boolean {
  if (eventUserSub && eventUserSub !== currentUserSub) {
    return false;
  }

  return true;
}

export function resolveVisibleGoalState(
  userSub: string | null,
  authReady: boolean,
): {
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  goalReady: boolean;
} {
  if (!authReady) {
    return { goal: null, hasSavedGoal: false, goalReady: false };
  }

  if (!isValidUserSub(userSub)) {
    return { goal: null, hasSavedGoal: false, goalReady: true };
  }

  const saved = readSavedUserGoal(userSub);
  return {
    goal: saved,
    hasSavedGoal: saved !== null,
    goalReady: true,
  };
}
