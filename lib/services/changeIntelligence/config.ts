/**
 * Phase 8A Change Intelligence — centralized, tunable materiality.
 * Conservative defaults. Not investment advice.
 */

export const INTELLIGENCE_STATE_SCHEMA_VERSION = 1 as const;

export const INTELLIGENCE_STATE_TIMEZONE = "Europe/Amsterdam" as const;

/** Compact book — enough for later quantity vs price distinction. */
export const TOP_HOLDINGS_LIMIT = 10;

export const CHANGE_INTELLIGENCE_THRESHOLDS = {
  /** Largest-holding concentration, percentage points. */
  concentrationPp: 2,
  /** Exposure group weight, percentage points. */
  exposureGroupPp: 3,
  /** Goal progress, percentage points. */
  goalProgressPp: 0.5,
  /** Resilience master score, 0–100 points. */
  resiliencePoints: 5,
  /** Same-scenario estimated portfolio impact, percentage points. */
  scenarioImpactPp: 2,
  /** Named holding weight, percentage points. */
  holdingWeightPp: 2,
} as const;

/** Ignore float noise when deciding whether quantity changed. */
export const QUANTITY_CHANGE_EPSILON = 1e-8;

export const INSUFFICIENT_HISTORY_REASON =
  "Change intelligence will become available after another comparable portfolio snapshot is stored.";

export const FIRST_HISTORY_COPY =
  "Tobailey is building your comparison history. Your first meaningful change review will appear after another comparable snapshot.";

export const CHANGE_INTELLIGENCE_COMPLETE_TEASE =
  "See what changed and why it matters";

export const NO_MATERIAL_CHANGE_COPY =
  "No material structural change compared with your previous stored snapshot.";

export const CHANGE_CATEGORY_ORDER = [
  "concentration",
  "exposure",
  "goal_progress",
  "resilience",
  "scenario_sensitivity",
  "holding_weight",
] as const;
