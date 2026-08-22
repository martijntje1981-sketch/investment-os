/**
 * Central user-scoped goal persistence and update events.
 */

import {
  annualContributionKey,
  assertUserSub,
  goalStorageKey,
  isValidPortfolioId,
  isValidUserSub,
} from "@/lib/client/portfolioStorageKeys";
import { normalizePassiveIncomeTarget } from "@/lib/client/goalPassiveIncome";
import { isValidExpectedAnnualReturnInput } from "@/lib/client/expectedReturnAssumption";
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
  const passiveIncomeTarget = normalizePassiveIncomeTarget(
    parsed.passiveIncomeTarget,
  );

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

  const name =
    typeof parsed.name === "string" && parsed.name.trim().length > 0
      ? parsed.name.trim().slice(0, 60)
      : undefined;

  return {
    ...(name ? { name } : {}),
    targetValue,
    targetYear,
    monthlyContribution,
    expectedAnnualReturn,
    ...(passiveIncomeTarget !== undefined ? { passiveIncomeTarget } : {}),
  };
}

export function sanitizeGoalForSave(goal: GoalSettings): GoalSettings | null {
  const normalized = normalizeGoal(goal);
  if (!normalized) return null;
  if (!isValidExpectedAnnualReturnInput(normalized.expectedAnnualReturn)) {
    return null;
  }
  return normalized;
}

export function readSavedUserGoal(
  userSub: string,
  portfolioId?: string | null,
  options?: { isPrimary?: boolean },
): GoalSettings | null {
  assertUserSub(userSub);

  try {
    if (isValidPortfolioId(portfolioId)) {
      const scoped = localStorage.getItem(goalStorageKey(userSub, portfolioId));
      if (scoped != null) {
        return normalizeGoal(JSON.parse(scoped) as Partial<GoalSettings>);
      }
      if (options?.isPrimary === false) return null;
    }
    const stored = localStorage.getItem(goalStorageKey(userSub));
    if (!stored) return null;
    return normalizeGoal(JSON.parse(stored) as Partial<GoalSettings>);
  } catch {
    return null;
  }
}

export function writeUserGoal(
  userSub: string,
  goal: GoalSettings,
  portfolioId?: string | null,
  options?: { isPrimary?: boolean },
): void {
  assertUserSub(userSub);
  if (isValidPortfolioId(portfolioId)) {
    localStorage.setItem(goalStorageKey(userSub, portfolioId), JSON.stringify(goal));
    if (options?.isPrimary !== false) {
      localStorage.setItem(goalStorageKey(userSub), JSON.stringify(goal));
    }
  } else {
    localStorage.setItem(goalStorageKey(userSub), JSON.stringify(goal));
  }
  localStorage.setItem(
    annualContributionKey(userSub),
    String(goal.monthlyContribution * 12),
  );
}

export function clearUserGoal(
  userSub: string,
  portfolioId?: string | null,
  options?: { isPrimary?: boolean },
): void {
  assertUserSub(userSub);
  if (isValidPortfolioId(portfolioId)) {
    localStorage.removeItem(goalStorageKey(userSub, portfolioId));
    if (options?.isPrimary !== false) {
      localStorage.removeItem(goalStorageKey(userSub));
    }
  } else {
    localStorage.removeItem(goalStorageKey(userSub));
  }
  localStorage.removeItem(annualContributionKey(userSub));
}

export function dispatchGoalUpdated(
  userSub: string,
  portfolioId?: string | null,
): void {
  assertUserSub(userSub);
  window.dispatchEvent(
    new CustomEvent(GOAL_UPDATED_EVENT, {
      detail: { userSub, portfolioId: portfolioId ?? null },
    }),
  );
}

export function saveUserGoal(
  userSub: string,
  goal: GoalSettings,
  portfolioId?: string | null,
  options?: { isPrimary?: boolean },
): void {
  const normalized = sanitizeGoalForSave(goal);
  if (!normalized) return;

  writeUserGoal(userSub, normalized, portfolioId, options);
  dispatchGoalUpdated(userSub, portfolioId);
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
  eventPortfolioId?: string | null,
  currentPortfolioId?: string | null,
): boolean {
  if (eventUserSub && eventUserSub !== currentUserSub) {
    return false;
  }
  if (
    eventPortfolioId &&
    currentPortfolioId &&
    eventPortfolioId !== currentPortfolioId
  ) {
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
