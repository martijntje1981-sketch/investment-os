/**
 * Phase 2D — Market Calmer public API.
 */

export type {
  MarketCalmerActivation,
  MarketCalmerDirection,
  MarketCalmerGoalContext,
  MarketCalmerMainDriver,
  MarketCalmerResilienceContext,
  MarketCalmerResult,
  MarketCalmerScenarioContext,
} from "@/lib/services/marketCalmer/types";

export {
  MARKET_CALMER_ASSUMPTIONS,
  MARKET_CALMER_HIGH_STRESS_MIN_PERCENT,
  MARKET_CALMER_LIMITATIONS,
  MARKET_CALMER_NOTABLE_MIN_PERCENT,
} from "@/lib/services/marketCalmer/config";

export {
  formatSignedPercent,
  resolveMarketCalmerActivation,
  resolveMarketCalmerDirection,
} from "@/lib/services/marketCalmer/activation";

export {
  buildMarketCalmer,
  marketCalmerDriverSymbols,
} from "@/lib/services/marketCalmer/buildMarketCalmer";

export { MARKET_CALMER_PROHIBITED_PATTERNS } from "@/lib/services/marketCalmer/wording";
