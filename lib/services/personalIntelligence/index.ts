/**
 * Personal Intelligence layer — Phase 1A foundation.
 * Composes existing portfolio/news/goals calculations; does not fetch or advise.
 */

export type {
  BuildPersonalIntelligenceTodayInput,
  DayContribution,
  PersonalAttentionState,
  PersonalIntelligenceFactKind,
  PersonalIntelligenceGoalSnippet,
  PersonalIntelligenceItem,
  PersonalIntelligencePortfolioMove,
  PersonalIntelligenceToday,
} from "@/lib/services/personalIntelligence/types";

export { buildPersonalIntelligenceToday } from "@/lib/services/personalIntelligence/buildPersonalIntelligenceToday";

export {
  buildDayContributions,
  contributionPpFromMove,
  previousPortfolioValueFromPerformers,
  rankContributionsByMateriality,
  weightMapFromValuedPositions,
} from "@/lib/services/personalIntelligence/contribution";

export {
  ATTRIBUTION_CONCENTRATION_WEIGHT,
  ATTRIBUTION_DISPLAY_MIN_PP,
  ATTRIBUTION_DOMINANT_SHARE,
  ATTRIBUTION_MATERIAL_MIN_PP,
  ATTRIBUTION_MIXED_PERIOD_NOTE,
  ATTRIBUTION_RECONCILE_TOLERANCE_PP,
  absContributionPp,
  contributionsReconcileToPortfolioPercent,
  dominantMaterialDriverShare,
  formatContributionPp,
  hasMixedContributionPeriods,
  isAttentionMaterialContribution,
  isDisplayMaterialContribution,
  sumContributionPp,
} from "@/lib/services/personalIntelligence/attribution";
export type { MaterialDriverShare } from "@/lib/services/personalIntelligence/attribution";

export {
  buildThirtySecondsBriefingView,
  selectThirtySecondsAttention,
  selectThirtySecondsDrivers,
  THIRTY_SECONDS_MIN_PP,
} from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
export type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";

export {
  ACTION_PLAN_CONCENTRATION_WEIGHT,
  ACTION_PLAN_DOMINANT_DRIVER_SHARE,
  ACTION_PLAN_MAX_ITEMS,
  ACTION_PLAN_PROHIBITED_PATTERNS,
  buildLookAheadCandidate,
  buildPersonalActionPlan,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
export type {
  ActionPlanCategory,
  BuildPersonalActionPlanOptions,
  PersonalActionPlan,
  PersonalActionPlanItem,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
