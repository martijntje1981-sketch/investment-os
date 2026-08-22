/**
 * Phase 2C — Resilience / Sleep Well types.
 * Deterministic structural resilience from existing exposure + scenario outputs.
 */

import type { ScenarioId, ScenarioResult } from "@/lib/services/scenarioEngine";

export type ResilienceFactorId =
  | "concentration"
  | "diversification"
  | "cash_buffer"
  | "scenario_sensitivity";

export type ResilienceBandId =
  | "strong"
  | "balanced"
  | "moderate"
  | "sensitive"
  | "highly_sensitive";

export type ResilienceStatus = "ok" | "insufficient_data";

export type ResilienceFactor = {
  id: ResilienceFactorId;
  label: string;
  score: number | null;
  applicable: boolean;
  explanation: string;
};

export type MostSensitiveScenario = {
  scenarioId: ScenarioId;
  scenarioName: string;
  estimatedPortfolioImpactPercent: number;
  estimatedPortfolioImpactAmount: number | null;
  affectedPortfolioWeightPercent: number | null;
  note: string;
};

export type ResilienceGoalContext = {
  scenarioId: ScenarioId;
  scenarioName: string;
  currentProgressPercent: number;
  stressedProgressPercent: number;
  summary: string;
} | null;

export type ResilienceProfile = {
  status: ResilienceStatus;
  /** Master 0–100 when enough factors apply; null if insufficient. */
  score: number | null;
  bandId: ResilienceBandId | null;
  bandLabel: string | null;
  summary: string;
  factors: ResilienceFactor[];
  primaryDriver: ResilienceFactorId | null;
  primaryDriverExplanation: string | null;
  mostSensitive: MostSensitiveScenario | null;
  goalContext: ResilienceGoalContext;
  scenarioResults: ScenarioResult[];
  assumptions: string[];
  limitations: string[];
};
