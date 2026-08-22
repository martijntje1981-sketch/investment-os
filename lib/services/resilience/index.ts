/**
 * Phase 2C — Resilience / Sleep Well public API.
 */

export type {
  MostSensitiveScenario,
  ResilienceBandId,
  ResilienceFactor,
  ResilienceFactorId,
  ResilienceGoalContext,
  ResilienceProfile,
  ResilienceStatus,
} from "@/lib/services/resilience/types";

export {
  bandFromScore,
  CASH_BUFFER_ANCHORS,
  DIVERSIFICATION_GROUP_ANCHORS,
  RESILIENCE_ASSUMPTIONS,
  RESILIENCE_BANDS,
  RESILIENCE_FACTOR_WEIGHTS,
  RESILIENCE_LIMITATIONS,
  SCENARIO_SENSITIVITY_ANCHORS,
} from "@/lib/services/resilience/config";

export { buildResilienceProfile } from "@/lib/services/resilience/buildResilienceProfile";

export {
  pickMostSensitiveScenario,
  scoreCashBufferFactor,
  scoreConcentrationFactor,
  scoreDiversificationFactor,
  scoreScenarioSensitivityFactor,
} from "@/lib/services/resilience/factors";

export { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
