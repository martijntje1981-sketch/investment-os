/**
 * Phase 2A — Scenario Engine result model.
 * Deterministic educational stress estimates from current exposure only.
 */

export type ScenarioId =
  | "global_equities_minus_20"
  | "bitcoin_minus_20"
  | "crypto_minus_20";

export type ScenarioShockKind =
  | "equity_classified"
  | "bitcoin_direct"
  | "crypto_classified";

export type ScenarioDataQuality = "high" | "medium" | "low" | "insufficient";

export type ScenarioStatus = "ok" | "insufficient_data";

export type ScenarioDefinition = {
  id: ScenarioId;
  name: string;
  shortLabel: string;
  /** Shock applied to affected exposure, e.g. -20 for −20%. */
  shockPercent: number;
  shockKind: ScenarioShockKind;
  description: string;
};

export type ScenarioAffectedHolding = {
  id: string;
  symbol: string;
  name: string;
  value: number;
  weightPercent: number;
};

export type ScenarioResult = {
  scenarioId: ScenarioId;
  scenarioName: string;
  status: ScenarioStatus;
  shockPercent: number;
  /** Portfolio impact in percent points (e.g. -8.2). Null when unavailable. */
  estimatedPortfolioImpactPercent: number | null;
  /** Impact in portfolio base valuation units (EUR storage). Null when unavailable. */
  estimatedPortfolioImpactAmount: number | null;
  /** Share of portfolio value included in the shocked sleeve. */
  affectedPortfolioWeightPercent: number | null;
  affectedValue: number | null;
  portfolioTotalValue: number;
  affectedHoldings: ScenarioAffectedHolding[];
  explanation: string;
  coverageNote: string | null;
  assumptions: string[];
  limitations: string[];
  dataQuality: ScenarioDataQuality;
};

/** Deferred scenarios documented for Phase 2A transparency (not calculated). */
export type DeferredScenarioNote = {
  id: string;
  name: string;
  reason: string;
};
