/**
 * Phase 8C copy and ranking order. Conservative. Not investment advice.
 */

export const PERIOD_FIRST_HISTORY_COPY =
  "Tobailey is building your comparison history. Your first change review will appear after another comparable period.";

export const PERIOD_NO_MATERIAL_CHANGE_COPY =
  "Your portfolio was broadly stable this period. No material structural changes were detected.";

/** Honest Q2 empty state. Do not fabricate a What Matters story. */
export const PERIOD_Q2_QUIET_COPY =
  "Nothing material needs your attention right now.";

/** Honest Q4 empty state when no distinct forward-looking information exists. */
export const PERIOD_Q4_QUIET_COPY =
  "Nothing distinct is flagged ahead for this period.";

export const PERIOD_COMPLETE_TEASE = "See what changed, why it matters, and what to understand next";

export const PERIOD_SECTION_TITLES = {
  happened: "What happened",
  changed: "What changed",
  matters: "What matters now",
  goal: "Am I on track?",
  ahead: "Looking ahead",
} as const;

/** Deterministic importance order for the period's single primary conclusion. */
export const PERIOD_INSIGHT_RANK = [
  "resilience_deterioration",
  "concentration_change",
  "goal_change",
  "exposure_change",
  "concentrated_performance",
  "meaningful_improvement",
  "no_material_change",
  "insufficient_history",
] as const;

export const PERIOD_CAUSAL_PATTERNS = [
  /\bcaused\b/i,
  /\bbecause of\b/i,
  /\bdue to\b/i,
  /\bthis led to\b/i,
  /\bthis resulted in\b/i,
] as const;

export const PERIOD_ADVICE_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\brebalance\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
] as const;
