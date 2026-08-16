/**
 * Phase 2D — Market Calmer activation thresholds.
 * Product heuristics aligned with Smart Dashboard move bands — not statistically validated.
 */

/** abs(portfolio day %) below this → inactive (normal day). */
export const MARKET_CALMER_NOTABLE_MIN_PERCENT = 0.35;

/** abs(portfolio day %) at/above this → high_stress. */
export const MARKET_CALMER_HIGH_STRESS_MIN_PERCENT = 1.5;

export const MARKET_CALMER_ASSUMPTIONS = [
  "Illustrative context from today’s portfolio move, existing attribution, and Phase 2 scenario/resilience outputs.",
  "Activation thresholds are product heuristics aligned with existing dashboard move bands — not statistically validated.",
  "Does not predict recovery, recommend trades, or claim that modeled scenarios caused today’s move.",
] as const;

export const MARKET_CALMER_LIMITATIONS = [
  "Inactive on normal days so the Dashboard stays quiet.",
  "Scenario comparison is only against currently supported Phase 2A shocks.",
  "Does not invent historical recovery timelines.",
] as const;
