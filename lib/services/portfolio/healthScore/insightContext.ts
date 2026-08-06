/**
 * Structured insight context — validated metrics only for AI / fallback.
 */

import { yearsRemaining } from "@/lib/services/portfolio/healthScore/math";
import type {
  PortfolioHealthScoreInput,
  PortfolioHealthScoreResult,
  PortfolioInsightEvidenceContext,
} from "@/lib/services/portfolio/healthScore/types";

export type InsightMarketMoveContext = {
  todayChangePercent?: number | null;
  topMoverSymbol?: string | null;
  weakestMoverSymbol?: string | null;
};

export function buildPortfolioInsightEvidenceContext(
  score: PortfolioHealthScoreResult,
  input: PortfolioHealthScoreInput,
  market?: InsightMarketMoveContext,
): PortfolioInsightEvidenceContext {
  const largest = input.analysis.largestPosition;
  const years = input.hasSavedGoal
    ? yearsRemaining(input.goal?.targetYear, input.now)
    : null;

  return {
    scoreVersion: score.version,
    fingerprint: score.fingerprint,
    score: score.score,
    bandLabel: score.band.label,
    confidenceLabel: score.confidence.label,
    classifiedCoveragePercent: score.confidence.classifiedCoveragePercent,
    portfolioIdentity: score.portfolioIdentity,
    expectedVolatility: input.profile.hasValuedPortfolio
      ? input.profile.expectedVolatility.level
      : null,
    largestHoldingSymbol: largest?.holding.symbol ?? null,
    largestHoldingWeightPercent:
      largest != null ? Number(largest.weightPercent.toFixed(1)) : null,
    topThreeWeightPercent: Number(
      input.analysis.topThreeWeightPercent.toFixed(1),
    ),
    hhi: Number(input.analysis.hhi.toFixed(3)),
    cashWeightPercent: Number(
      input.profile.classification.cashWeight.toFixed(1),
    ),
    cryptoWeightPercent: Number(
      input.profile.classification.cryptoWeight.toFixed(1),
    ),
    goalYearsRemaining: years != null ? Number(years.toFixed(1)) : null,
    goalAlignmentLabel: input.hasSavedGoal
      ? input.profile.goalAlignment.label
      : null,
    hasPassiveIncomeGoal: Boolean(
      input.goal?.passiveIncomeTarget && input.goal.passiveIncomeTarget > 0,
    ),
    dimensionScores: score.dimensions.map((dimension) => ({
      id: dimension.id,
      label: dimension.label,
      score: dimension.score,
      applicable: dimension.applicable,
    })),
    strengths: score.strengths.map((item) => ({
      title: item.title,
      detail: item.detail,
    })),
    attentionPoints: score.attentionPoints.map((item) => ({
      title: item.title,
      detail: item.detail,
    })),
    todayChangePercent: market?.todayChangePercent ?? null,
    topMoverSymbol: market?.topMoverSymbol ?? null,
    weakestMoverSymbol: market?.weakestMoverSymbol ?? null,
    dataLimitations: [
      ...score.confidence.notes,
      ...input.profile.dataNotes.slice(0, 3),
    ],
  };
}
