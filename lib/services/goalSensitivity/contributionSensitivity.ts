/**
 * Personal contribution sensitivity — ephemeral monthly contribution overrides.
 * Distinct from market scenarios (things the user can influence illustratively).
 */

import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { toGoalSnapshot } from "@/lib/services/goalSensitivity/snapshots";
import type {
  ContributionDeltaEuro,
  ContributionSensitivityResult,
} from "@/lib/services/goalSensitivity/types";
import {
  assertNoAdvisoryLanguage,
  CONTRIBUTION_ASSUMPTIONS,
  CONTRIBUTION_LIMITATIONS,
} from "@/lib/services/goalSensitivity/wording";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export const CONTRIBUTION_DELTA_OPTIONS: readonly ContributionDeltaEuro[] = [
  -100, 0, 100, 200,
] as const;

function deltaLabel(delta: ContributionDeltaEuro): string {
  if (delta === 0) return "Current";
  if (delta > 0) return `+€${delta}`;
  return `−€${Math.abs(delta)}`;
}

/**
 * Illustrative monthly contribution what-ifs using the existing goal engine.
 * Does not mutate stored goal settings.
 */
export function buildContributionSensitivity(input: {
  currentPortfolioValue: number;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
}): ContributionSensitivityResult {
  const assumptions = [...CONTRIBUTION_ASSUMPTIONS];
  const limitations = [...CONTRIBUTION_LIMITATIONS];

  if (!input.hasSavedGoal || !input.goal) {
    const result: ContributionSensitivityResult = {
      status: "no_goal",
      baselineMonthlyContribution: null,
      rows: [],
      explanation:
        "Add a goal with a monthly contribution to explore illustrative contribution changes.",
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
    const result: ContributionSensitivityResult = {
      status: "insufficient_data",
      baselineMonthlyContribution: null,
      rows: [],
      explanation:
        "Contribution sensitivity is unavailable because portfolio value cannot be determined reliably.",
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

  const baseline = Math.max(0, input.goal.monthlyContribution);

  const rows = CONTRIBUTION_DELTA_OPTIONS.map((deltaEuro) => {
    const monthlyContribution = Math.max(0, baseline + deltaEuro);
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: input.currentPortfolioValue,
      goal: {
        ...input.goal!,
        monthlyContribution,
      },
      hasSavedGoal: true,
    });

    return {
      deltaEuro,
      label: deltaLabel(deltaEuro),
      monthlyContribution,
      progress: toGoalSnapshot(progress),
    };
  });

  const result: ContributionSensitivityResult = {
    status: "ok",
    baselineMonthlyContribution: baseline,
    rows,
    explanation:
      baseline === 0
        ? "Current saved monthly contribution is €0. Illustrative positive amounts show how the existing projection changes if contributions were added."
        : `Current saved monthly contribution is €${Math.round(baseline)}. These illustrative amounts update the current trajectory using the existing goal engine.`,
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
