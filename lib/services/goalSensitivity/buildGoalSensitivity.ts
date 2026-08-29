/**
 * Phase 2B — bridge ScenarioResult → existing goal progress engine.
 * Pure / ephemeral — never mutates stored GoalSettings.
 */

import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import {
  monthsBetweenIsoDates,
  round1,
  roundMoney,
  toGoalSnapshot,
} from "@/lib/services/goalSensitivity/snapshots";
import type { GoalSensitivityResult } from "@/lib/services/goalSensitivity/types";
import {
  assertNoAdvisoryLanguage,
  MARKET_ASSUMPTIONS,
  MARKET_LIMITATIONS,
} from "@/lib/services/goalSensitivity/wording";
import type { ScenarioResult } from "@/lib/services/scenarioEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

function finalize(result: GoalSensitivityResult): GoalSensitivityResult {
  assertNoAdvisoryLanguage([
    result.explanation,
    ...result.assumptions,
    ...result.limitations,
  ]);
  return result;
}

/**
 * Compare current goal progress vs progress after applying a scenario impact amount.
 */
export function buildGoalSensitivityFromScenario(input: {
  scenarioResult: ScenarioResult;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  /**
   * Optional override for current portfolio value.
   * Defaults to scenarioResult.portfolioTotalValue for consistency with Phase 2A.
   */
  currentPortfolioValue?: number;
}): GoalSensitivityResult {
  const { scenarioResult, goal, hasSavedGoal } = input;
  const assumptions = [...MARKET_ASSUMPTIONS];
  const limitations = [...MARKET_LIMITATIONS];

  const currentPortfolioValue =
    input.currentPortfolioValue ?? scenarioResult.portfolioTotalValue;

  if (!hasSavedGoal || !goal) {
    return finalize({
      status: "no_goal",
      scenarioResult,
      goal: null,
      currentGoal: null,
      stressedGoal: null,
      hypotheticalPortfolioValue: null,
      currentProgressPercent: null,
      stressedProgressPercent: null,
      progressChangePercent: null,
      currentGap: null,
      stressedGap: null,
      gapChange: null,
      currentProjectedDate: null,
      stressedProjectedDate: null,
      currentProjectedLabel: null,
      stressedProjectedLabel: null,
      estimatedDelayMonths: null,
      dataQuality: "insufficient",
      explanation:
        "Add a goal to see how portfolio scenarios could affect it.",
      assumptions,
      limitations,
    });
  }

  if (
    scenarioResult.status !== "ok" ||
    scenarioResult.estimatedPortfolioImpactAmount === null ||
    !(currentPortfolioValue > 0) ||
    !Number.isFinite(currentPortfolioValue)
  ) {
    return finalize({
      status: "scenario_unavailable",
      scenarioResult,
      goal,
      currentGoal: null,
      stressedGoal: null,
      hypotheticalPortfolioValue: null,
      currentProgressPercent: null,
      stressedProgressPercent: null,
      progressChangePercent: null,
      currentGap: null,
      stressedGap: null,
      gapChange: null,
      currentProjectedDate: null,
      stressedProjectedDate: null,
      currentProjectedLabel: null,
      stressedProjectedLabel: null,
      estimatedDelayMonths: null,
      dataQuality: "insufficient",
      explanation:
        "Goal impact is unavailable because the selected scenario could not produce a reliable portfolio value change.",
      assumptions,
      limitations: [
        ...limitations,
        "Incomplete scenario coverage or missing portfolio value prevents a reliable goal comparison.",
      ],
    });
  }

  const hypotheticalPortfolioValue = roundMoney(
    Math.max(
      0,
      currentPortfolioValue + scenarioResult.estimatedPortfolioImpactAmount,
    ),
  );

  const currentProgress = buildGoalProgressEngine({
    currentPortfolioValue,
    goal,
    hasSavedGoal: true,
  });
  const stressedProgress = buildGoalProgressEngine({
    currentPortfolioValue: hypotheticalPortfolioValue,
    goal,
    hasSavedGoal: true,
  });

  // Guard: engine must not mutate the caller's goal object.
  // (Caller tests assert the same reference fields remain unchanged.)

  const currentGoal = toGoalSnapshot(currentProgress);
  const stressedGoal = toGoalSnapshot(stressedProgress);

  const progressChangePercent = round1(
    stressedGoal.progressPercent - currentGoal.progressPercent,
  );
  const gapChange = roundMoney(
    stressedGoal.remainingAmount - currentGoal.remainingAmount,
  );
  const estimatedDelayMonths = monthsBetweenIsoDates(
    currentGoal.estimatedCompletionDate,
    stressedGoal.estimatedCompletionDate,
  );

  let dataQuality: GoalSensitivityResult["dataQuality"] = "high";
  if (scenarioResult.dataQuality === "medium") {
    dataQuality = "medium";
  } else if (
    scenarioResult.dataQuality === "low" ||
    scenarioResult.dataQuality === "insufficient"
  ) {
    dataQuality = "low";
  }

  const explanation =
    currentGoal.goalReached && stressedGoal.goalReached
      ? "Under current assumptions, the portfolio remains at or above the saved target after this hypothetical scenario."
      : `Based on current goal assumptions, this hypothetical scenario changes the remaining goal gap by approximately ${formatSignedMoney(gapChange)}.`;

  return finalize({
    status: "ok",
    scenarioResult,
    goal,
    currentGoal,
    stressedGoal,
    hypotheticalPortfolioValue,
    currentProgressPercent: currentGoal.progressPercent,
    stressedProgressPercent: stressedGoal.progressPercent,
    progressChangePercent,
    currentGap: currentGoal.remainingAmount,
    stressedGap: stressedGoal.remainingAmount,
    gapChange,
    currentProjectedDate: currentGoal.estimatedCompletionDate,
    stressedProjectedDate: stressedGoal.estimatedCompletionDate,
    currentProjectedLabel: currentGoal.estimatedCompletionLabel,
    stressedProjectedLabel: stressedGoal.estimatedCompletionLabel,
    estimatedDelayMonths,
    dataQuality,
    explanation,
    assumptions,
    limitations,
  });
}

function formatSignedMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(abs);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}
