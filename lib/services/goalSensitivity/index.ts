/**
 * Phase 2B — Goal Sensitivity public API.
 * Bridges Phase 2A ScenarioResult into the existing goal progress engine.
 */

export type {
  ContributionDeltaEuro,
  ContributionSensitivityResult,
  ContributionSensitivityRow,
  GoalSensitivityDataQuality,
  GoalSensitivityResult,
  GoalSensitivityStatus,
  GoalSnapshot,
  TargetYearSensitivityResult,
} from "@/lib/services/goalSensitivity/types";

export { buildGoalSensitivityFromScenario } from "@/lib/services/goalSensitivity/buildGoalSensitivity";

export {
  buildContributionSensitivity,
  CONTRIBUTION_DELTA_OPTIONS,
} from "@/lib/services/goalSensitivity/contributionSensitivity";

export { buildTargetYearSensitivity } from "@/lib/services/goalSensitivity/targetYearSensitivity";

export {
  GOAL_SENSITIVITY_PROHIBITED_PATTERNS,
} from "@/lib/services/goalSensitivity/wording";
