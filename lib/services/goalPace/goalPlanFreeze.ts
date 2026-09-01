import type { DbGoalRow } from "@/lib/services/portfolio/types";
import type { FrozenGoalPlan } from "@/lib/services/goalPace/types";

/**
 * Same 31 Dec UTC convention as monthsUntilTargetYear in the Goal engine.
 * Do not invent a different compounding or target-date model.
 */
export function goalTargetDateUtcIso(targetYear: number): string {
  const date = new Date(Date.UTC(targetYear, 11, 31));
  return date.toISOString().slice(0, 10);
}

export function buildFrozenGoalPlan(
  goal: Pick<
    DbGoalRow,
    | "id"
    | "target_value"
    | "target_year"
    | "monthly_contribution"
    | "expected_annual_return"
    | "updated_at"
  > | null,
  capturedAt: Date,
): FrozenGoalPlan | null {
  if (!goal) return null;
  const targetYear = Number(goal.target_year);
  if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 9999) {
    return null;
  }
  const targetValue = Number(goal.target_value);
  const monthlyContribution = Number(goal.monthly_contribution);
  const expectedAnnualReturn = Number(goal.expected_annual_return);
  if (
    !Number.isFinite(targetValue) ||
    targetValue <= 0 ||
    !Number.isFinite(monthlyContribution) ||
    monthlyContribution < 0 ||
    !Number.isFinite(expectedAnnualReturn)
  ) {
    return null;
  }

  // financial_goals.id is the stable identifier. Do not invent one when absent.
  // Limitation: without a persisted Goal id, later delete/recreate cannot be
  // distinguished from this capture by identifier. Numeric plan fields still freeze.
  const goalId =
    typeof goal.id === "string" && goal.id.trim().length > 0 ? goal.id : null;

  return {
    goalId,
    targetValue,
    targetYear,
    targetDateIso: goalTargetDateUtcIso(targetYear),
    monthlyContribution,
    expectedAnnualReturn,
    goalUpdatedAt: goal.updated_at ?? null,
    planCapturedAt: capturedAt.toISOString(),
  };
}
