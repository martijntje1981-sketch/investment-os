/**
 * Build the canonical Portfolio Scorecard from validated inputs.
 */

import type { PortfolioHealthScoreResult } from "@/lib/services/portfolio/healthScore";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import { adaptHealthScore } from "@/lib/services/portfolio/scorecard/adaptHealth";
import { buildGoalScore } from "@/lib/services/portfolio/scorecard/buildGoalScore";
import {
  buildMomentumScore,
  type BuildMomentumScoreInput,
} from "@/lib/services/portfolio/scorecard/buildMomentumScore";
import { buildReadinessScore } from "@/lib/services/portfolio/scorecard/buildReadinessScore";
import { buildAllScoreContexts } from "@/lib/services/portfolio/scorecard/buildScoreContext";
import { PORTFOLIO_SCORECARD_VERSION } from "@/lib/services/portfolio/scorecard/config";
import { buildScorecardSummary } from "@/lib/services/portfolio/scorecard/summary";
import type { PortfolioScorecardResult } from "@/lib/services/portfolio/scorecard/types";

export type BuildPortfolioScorecardInput = {
  health: PortfolioHealthScoreResult;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  goalProgress: GoalProgress;
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  momentum: BuildMomentumScoreInput;
  hasPerformanceHistory?: boolean;
  calculatedAt?: string;
  /** Optional holdings for factual momentum/readiness context only (not scoring). */
  holdings?: StoredPortfolioHolding[];
};

export function buildPortfolioScorecard(
  input: BuildPortfolioScorecardInput,
): PortfolioScorecardResult {
  const calculatedAt =
    input.calculatedAt ?? input.health.calculatedAt ?? new Date().toISOString();

  const healthScore = adaptHealthScore(input.health);
  const goalScore = buildGoalScore({
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
    progress: input.goalProgress,
    calculatedAt,
  });
  const momentumScore = buildMomentumScore({
    ...input.momentum,
    calculatedAt,
  });
  const readinessScore = buildReadinessScore({
    analysis: input.analysis,
    exposure: input.exposure,
    health: input.health,
    hasSavedGoal: input.hasSavedGoal,
    hasPerformanceHistory: input.hasPerformanceHistory,
    calculatedAt,
  });

  const contexts = buildAllScoreContexts({
    health: input.health,
    analysis: input.analysis,
    exposure: input.exposure,
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
    goalProgress: input.goalProgress,
    goalScore,
    momentum: input.momentum,
    momentumScore,
    readinessScore,
    hasPerformanceHistory: input.hasPerformanceHistory,
    holdings: input.holdings,
  });

  const scores = {
    health: { ...healthScore, context: contexts.health },
    goal: { ...goalScore, context: contexts.goal },
    momentum: { ...momentumScore, context: contexts.momentum },
    readiness: { ...readinessScore, context: contexts.readiness },
  };

  return {
    scorecardVersion: PORTFOLIO_SCORECARD_VERSION,
    calculatedAt,
    portfolioFingerprint: input.health.fingerprint,
    scores,
    summary: buildScorecardSummary(scores),
  };
}
