/**
 * Legacy adapter — prefer buildPortfolioHealthScoreV1.
 * Kept so older imports resolve while the v1 engine is the source of truth.
 */

export {
  buildPortfolioHealthScoreV1 as buildPortfolioHealthScore,
  PORTFOLIO_HEALTH_SCORE_VERSION,
  HEALTH_SCORE_DISCLAIMER,
} from "@/lib/services/portfolio/healthScore";
export type {
  PortfolioHealthScoreResult as PortfolioHealthScore,
  PortfolioHealthScoreInput as PortfolioHealthInput,
} from "@/lib/services/portfolio/healthScore";
