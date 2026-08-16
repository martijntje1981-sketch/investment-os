/**
 * Phase 2B — Goal Sensitivity result model.
 * Illustrative bridge from ScenarioResult → existing goal engine.
 */

import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { ScenarioResult } from "@/lib/services/scenarioEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export type GoalSensitivityStatus =
  | "ok"
  | "no_goal"
  | "scenario_unavailable"
  | "insufficient_data";

export type GoalSensitivityDataQuality =
  | "high"
  | "medium"
  | "low"
  | "insufficient";

export type GoalSnapshot = {
  progressPercent: number;
  remainingAmount: number;
  currentValue: number;
  targetValue: number;
  status: GoalProgress["status"];
  trajectory: GoalProgress["currentTrajectory"];
  estimatedCompletionDate: string | null;
  estimatedCompletionLabel: string | null;
  goalReached: boolean;
};

export type GoalSensitivityResult = {
  status: GoalSensitivityStatus;
  scenarioResult: ScenarioResult;
  goal: GoalSettings | null;
  currentGoal: GoalSnapshot | null;
  stressedGoal: GoalSnapshot | null;
  hypotheticalPortfolioValue: number | null;
  currentProgressPercent: number | null;
  stressedProgressPercent: number | null;
  progressChangePercent: number | null;
  currentGap: number | null;
  stressedGap: number | null;
  gapChange: number | null;
  currentProjectedDate: string | null;
  stressedProjectedDate: string | null;
  currentProjectedLabel: string | null;
  stressedProjectedLabel: string | null;
  /** Month delta from current → stressed projected dates when both exist. */
  estimatedDelayMonths: number | null;
  dataQuality: GoalSensitivityDataQuality;
  explanation: string;
  assumptions: string[];
  limitations: string[];
};

export type ContributionDeltaEuro = -100 | 0 | 100 | 200;

export type ContributionSensitivityRow = {
  deltaEuro: ContributionDeltaEuro;
  label: string;
  monthlyContribution: number;
  progress: GoalSnapshot;
};

export type ContributionSensitivityResult = {
  status: "ok" | "no_goal" | "insufficient_data";
  baselineMonthlyContribution: number | null;
  rows: ContributionSensitivityRow[];
  explanation: string;
  assumptions: string[];
  limitations: string[];
};

export type TargetYearSensitivityResult = {
  status: "ok" | "no_goal" | "insufficient_data";
  currentTargetYear: number | null;
  illustrativeTargetYear: number | null;
  current: GoalSnapshot | null;
  withExtraYear: GoalSnapshot | null;
  explanation: string;
  assumptions: string[];
  limitations: string[];
};
