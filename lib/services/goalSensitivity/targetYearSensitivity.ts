/**
 * Optional target-year sensitivity — ephemeral +1 year deadline override.
 */

import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { toGoalSnapshot } from "@/lib/services/goalSensitivity/snapshots";
import type { TargetYearSensitivityResult } from "@/lib/services/goalSensitivity/types";
import {
  assertNoAdvisoryLanguage,
  TARGET_YEAR_ASSUMPTIONS,
  TARGET_YEAR_LIMITATIONS,
} from "@/lib/services/goalSensitivity/wording";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

/**
 * Compare current goal schedule vs giving the target year one more year.
 * Does not mutate stored goal settings.
 */
export function buildTargetYearSensitivity(input: {
  currentPortfolioValue: number;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
}): TargetYearSensitivityResult {
  const assumptions = [...TARGET_YEAR_ASSUMPTIONS];
  const limitations = [...TARGET_YEAR_LIMITATIONS];

  if (!input.hasSavedGoal || !input.goal) {
    const result: TargetYearSensitivityResult = {
      status: "no_goal",
      currentTargetYear: null,
      illustrativeTargetYear: null,
      current: null,
      withExtraYear: null,
      explanation:
        "Add a goal to explore an illustrative one-year extension of the target year.",
      assumptions,
      limitations,
    };
    assertNoAdvisoryLanguage([
      result.explanation,
      ...result.assumptions,
      ...result.limitations,
    ]);
    return result;
  }

  if (
    !(input.currentPortfolioValue >= 0) ||
    !Number.isFinite(input.currentPortfolioValue)
  ) {
    const result: TargetYearSensitivityResult = {
      status: "insufficient_data",
      currentTargetYear: null,
      illustrativeTargetYear: null,
      current: null,
      withExtraYear: null,
      explanation:
        "Target-year sensitivity is unavailable because portfolio value cannot be determined reliably.",
      assumptions,
      limitations,
    };
    assertNoAdvisoryLanguage([
      result.explanation,
      ...result.assumptions,
      ...result.limitations,
    ]);
    return result;
  }

  const currentTargetYear = input.goal.targetYear;
  const illustrativeTargetYear = currentTargetYear + 1;

  const current = toGoalSnapshot(
    buildGoalProgressEngine({
      currentPortfolioValue: input.currentPortfolioValue,
      goal: input.goal,
      hasSavedGoal: true,
    }),
  );

  const withExtraYear = toGoalSnapshot(
    buildGoalProgressEngine({
      currentPortfolioValue: input.currentPortfolioValue,
      goal: {
        ...input.goal,
        targetYear: illustrativeTargetYear,
      },
      hasSavedGoal: true,
    }),
  );

  const result: TargetYearSensitivityResult = {
    status: "ok",
    currentTargetYear,
    illustrativeTargetYear,
    current,
    withExtraYear,
    explanation: `An illustrative target year of ${illustrativeTargetYear} (instead of ${currentTargetYear}) updates schedule status using the existing goal engine. Portfolio value and contributions stay unchanged.`,
    assumptions,
    limitations,
  };

  assertNoAdvisoryLanguage([
    result.explanation,
    ...result.assumptions,
    ...result.limitations,
  ]);

  return result;
}
