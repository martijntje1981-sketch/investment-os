/**
 * Portfolio Health Score v1 — public exports.
 */

export {
  HEALTH_SCORE_BANDS,
  HEALTH_SCORE_BASE_WEIGHTS,
  HEALTH_SCORE_DIMENSION_LABELS,
  HEALTH_SCORE_DISCLAIMER,
  PORTFOLIO_HEALTH_SCORE_VERSION,
} from "@/lib/services/portfolio/healthScore/config";
export {
  buildPortfolioHealthScoreV1,
  getDimension,
} from "@/lib/services/portfolio/healthScore/buildScore";
export { buildPortfolioHealthFingerprint } from "@/lib/services/portfolio/healthScore/fingerprint";
export { buildHealthScoreConfidence } from "@/lib/services/portfolio/healthScore/confidence";
export {
  buildPortfolioInsightEvidenceContext,
  type InsightMarketMoveContext,
} from "@/lib/services/portfolio/healthScore/insightContext";
export {
  buildDeterministicPortfolioInsight,
  buildDeterministicPortfolioInsightFromScorecard,
  PORTFOLIO_INSIGHT_DISCLAIMER,
  type PortfolioInsightResult,
  type PortfolioInsightScoreLine,
} from "@/lib/services/portfolio/healthScore/deterministicInsight";
export type {
  PortfolioHealthScoreInput,
  PortfolioHealthScoreResult,
  PortfolioInsightEvidenceContext,
  HealthScoreDimensionResult,
  HealthScoreConfidence,
  HealthScoreFactor,
} from "@/lib/services/portfolio/healthScore/types";
