/**
 * Centralized Resilience / Sleep Well thresholds and weights.
 * Product labels — not investment advice.
 */

import type { ResilienceBandId } from "@/lib/services/resilience/types";

/** Factor weights for the master resilience score (must sum to 1). */
export const RESILIENCE_FACTOR_WEIGHTS = {
  concentration: 0.3,
  diversification: 0.25,
  cash_buffer: 0.2,
  scenario_sensitivity: 0.25,
} as const;

/**
 * Score bands (inclusive lower bound).
 * Higher score = more structural resilience to modeled shocks.
 */
export const RESILIENCE_BANDS: ReadonlyArray<{
  id: ResilienceBandId;
  minScore: number;
  label: string;
}> = [
  { id: "strong", minScore: 80, label: "Strong resilience" },
  { id: "balanced", minScore: 65, label: "Balanced" },
  { id: "moderate", minScore: 45, label: "Moderate" },
  { id: "sensitive", minScore: 25, label: "Sensitive" },
  { id: "highly_sensitive", minScore: 0, label: "Highly sensitive" },
] as const;

/** Cash weight → resilience contribution for modeled equity/crypto shocks. */
export const CASH_BUFFER_ANCHORS = [
  { at: 0, score: 38 },
  { at: 5, score: 55 },
  { at: 10, score: 70 },
  { at: 15, score: 78 },
  { at: 25, score: 85 },
  { at: 40, score: 88 },
  { at: 70, score: 72 },
  { at: 90, score: 58 },
] as const;

/**
 * Absolute portfolio impact % from the worst supported scenario → sensitivity score.
 * Larger |impact| → lower resilience contribution.
 */
export const SCENARIO_SENSITIVITY_ANCHORS = [
  { at: 0, score: 100 },
  { at: 4, score: 82 },
  { at: 8, score: 68 },
  { at: 12, score: 55 },
  { at: 20, score: 38 },
  { at: 30, score: 22 },
  { at: 40, score: 10 },
] as const;

/** Distinct countable exposure groups → diversification score anchors. */
export const DIVERSIFICATION_GROUP_ANCHORS = [
  { at: 1, score: 24 },
  { at: 2, score: 48 },
  { at: 3, score: 68 },
  { at: 4, score: 82 },
  { at: 5, score: 90 },
  { at: 6, score: 94 },
] as const;

export const RESILIENCE_ASSUMPTIONS = [
  "Illustrative structural resilience based on current portfolio composition and supported Phase 2A scenarios.",
  "Uses existing concentration, exposure classification, cash weight, and scenario engine outputs.",
  "Sleep Well is an emotional framing for structural sensitivity — not a guarantee of safety.",
] as const;

export const RESILIENCE_LIMITATIONS = [
  "Does not predict future drawdowns or probability of loss.",
  "Most-sensitive scenario is only among currently supported modeled shocks.",
  "Does not include historical volatility or drawdown statistics.",
  "Does not recommend trades, rebalancing, or portfolio changes.",
  "Fixed income is classified when identifiable, but interest-rate and credit shocks are not numerically modeled without reliable duration or credit inputs.",
] as const;

export function bandFromScore(score: number): {
  id: ResilienceBandId;
  label: string;
} {
  for (const band of RESILIENCE_BANDS) {
    if (score >= band.minScore) {
      return { id: band.id, label: band.label };
    }
  }
  return {
    id: "highly_sensitive",
    label: "Highly sensitive",
  };
}
