/**
 * Phase 2A — Scenario Engine public API.
 * Deterministic educational stress testing from current portfolio exposure.
 */

export type {
  DeferredScenarioNote,
  ScenarioAffectedHolding,
  ScenarioDataQuality,
  ScenarioDefinition,
  ScenarioId,
  ScenarioResult,
  ScenarioShockKind,
  ScenarioStatus,
} from "@/lib/services/scenarioEngine/types";

export {
  DEFERRED_SCENARIO_NOTES,
  getScenarioDefinition,
  SCENARIO_DEFINITION_BY_ID,
  SCENARIO_DEFINITIONS,
} from "@/lib/services/scenarioEngine/scenarios";

export {
  applyExposureShock,
  round1,
  roundMoney,
} from "@/lib/services/scenarioEngine/applyShock";

export {
  isHoldingAffectedByShock,
  listValuedHoldings,
  selectAffectedHoldings,
  sumValues,
} from "@/lib/services/scenarioEngine/selectAffectedExposure";

export {
  assertNoAdvisoryLanguage,
  SCENARIO_PROHIBITED_PATTERNS,
} from "@/lib/services/scenarioEngine/wording";

export {
  runAllPortfolioScenarios,
  runPortfolioScenario,
} from "@/lib/services/scenarioEngine/runScenario";
