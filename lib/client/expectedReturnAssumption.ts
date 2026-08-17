/**
 * Canonical helpers for the user's expected annual return assumption.
 * Source of truth remains GoalSettings.expectedAnnualReturn — never invent a second store.
 */

import {
  buildGoalProgressEngine,
  type PortfolioHistoryPoint,
} from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

/** Inclusive UI / save bounds for user-entered assumptions (percent points). */
export const EXPECTED_ANNUAL_RETURN_MIN = 0;
export const EXPECTED_ANNUAL_RETURN_MAX = 50;

export function isValidExpectedAnnualReturnInput(
  value: unknown,
): value is number {
  const n = typeof value === "number" ? value : Number(value);
  return (
    Number.isFinite(n) &&
    n >= EXPECTED_ANNUAL_RETURN_MIN &&
    n <= EXPECTED_ANNUAL_RETURN_MAX
  );
}

/** Read the stored assumption; null when no goal / unusable value. */
export function getExpectedReturnAssumption(
  goal: GoalSettings | null | undefined,
): number | null {
  if (!goal) return null;
  const n = Number(goal.expectedAnnualReturn);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatExpectedReturnPa(percent: number): string {
  const rounded =
    Number.isInteger(percent) || Math.abs(percent - Math.round(percent)) < 1e-9
      ? String(Math.round(percent))
      : (Math.round(percent * 10) / 10).toFixed(1);
  return `${rounded}% p.a.`;
}

/** Compact forward-looking context — never implies a Tobailey forecast. */
export function formatExpectedReturnAssumptionContext(percent: number): string {
  return `Based on your ${formatExpectedReturnPa(percent)} assumption`;
}

export function withExpectedReturnAssumption(
  goal: GoalSettings,
  nextExpectedAnnualReturn: number,
): GoalSettings | null {
  if (!isValidExpectedAnnualReturnInput(nextExpectedAnnualReturn)) {
    return null;
  }
  return {
    ...goal,
    expectedAnnualReturn: nextExpectedAnnualReturn,
  };
}

export type ExpectedReturnImpactPreview = {
  fromPercent: number;
  toPercent: number;
  fromCompletionLabel: string | null;
  toCompletionLabel: string | null;
  usable: boolean;
};

/**
 * Illustrative completion-label delta using the existing goal engine only.
 */
export function buildExpectedReturnImpactPreview(input: {
  goal: GoalSettings;
  currentPortfolioValue: number;
  portfolioHistory?: PortfolioHistoryPoint[];
  nextExpectedAnnualReturn: number;
}): ExpectedReturnImpactPreview | null {
  if (!isValidExpectedAnnualReturnInput(input.nextExpectedAnnualReturn)) {
    return null;
  }

  const fromPercent = getExpectedReturnAssumption(input.goal);
  if (fromPercent == null) return null;

  const history = input.portfolioHistory;
  const current = buildGoalProgressEngine({
    currentPortfolioValue: input.currentPortfolioValue,
    goal: input.goal,
    hasSavedGoal: true,
    portfolioHistory: history,
  });
  const nextGoal = withExpectedReturnAssumption(
    input.goal,
    input.nextExpectedAnnualReturn,
  );
  if (!nextGoal) return null;

  const next = buildGoalProgressEngine({
    currentPortfolioValue: input.currentPortfolioValue,
    goal: nextGoal,
    hasSavedGoal: true,
    portfolioHistory: history,
  });

  const fromLabel =
    current.estimatedCompletionLabel &&
    current.estimatedCompletionLabel !== "Insufficient history"
      ? current.estimatedCompletionLabel
      : null;
  const toLabel =
    next.estimatedCompletionLabel &&
    next.estimatedCompletionLabel !== "Insufficient history"
      ? next.estimatedCompletionLabel
      : null;

  return {
    fromPercent,
    toPercent: input.nextExpectedAnnualReturn,
    fromCompletionLabel: fromLabel,
    toCompletionLabel: toLabel,
    usable: Boolean(fromLabel && toLabel),
  };
}
