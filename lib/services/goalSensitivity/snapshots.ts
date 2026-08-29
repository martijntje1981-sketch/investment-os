/**
 * Shared GoalProgress → snapshot helpers for Goal Sensitivity.
 */

import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSnapshot } from "@/lib/services/goalSensitivity/types";

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toGoalSnapshot(progress: GoalProgress): GoalSnapshot {
  const hasReliableProjection =
    progress.estimatedCompletionDate !== null &&
    progress.estimatedCompletionLabel !== "Insufficient history";

  return {
    progressPercent: round1(progress.currentProgressPercent),
    remainingAmount: roundMoney(progress.remainingAmount),
    currentValue: roundMoney(progress.currentValue),
    targetValue: progress.targetValue,
    status: progress.status,
    trajectory: progress.currentTrajectory,
    estimatedCompletionDate: hasReliableProjection
      ? progress.estimatedCompletionDate
      : null,
    estimatedCompletionLabel: hasReliableProjection
      ? progress.estimatedCompletionLabel
      : null,
    goalReached: progress.goalReached,
  };
}

/** Whole-month difference between two ISO dates (stressed − current). */
export function monthsBetweenIsoDates(
  currentIso: string | null,
  stressedIso: string | null,
): number | null {
  if (!currentIso || !stressedIso) {
    return null;
  }

  const current = new Date(currentIso);
  const stressed = new Date(stressedIso);
  if (Number.isNaN(current.getTime()) || Number.isNaN(stressed.getTime())) {
    return null;
  }

  const months =
    (stressed.getFullYear() - current.getFullYear()) * 12 +
    (stressed.getMonth() - current.getMonth());

  return Object.is(months, -0) ? 0 : months;
}
