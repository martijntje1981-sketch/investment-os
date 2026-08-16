/**
 * Daily / Weekly / Monthly Pulse bands (v2) — distinct semantic labels.
 * Shared score edges; period-specific meaning.
 *
 * Product heuristics (documented, not hidden):
 * - Daily → “What is happening right now?” (direction + breadth − concentration)
 * - Weekly → “Is short-term direction improving or weakening?”
 * - Monthly → “Is the portfolio structurally improving?”
 */

import {
  SCORE_BAND_EDGES,
  type ScoreBandDefinition,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";

export const DAILY_PORTFOLIO_SCORE_VERSION = "dps-v2" as const;
export const WEEKLY_PORTFOLIO_SCORE_VERSION = "wps-v2" as const;
export const MONTHLY_PORTFOLIO_SCORE_VERSION = "mps-v2" as const;

/** Central Daily Pulse weights (remaining adjustments are absolute points). */
export const DAILY_PULSE_WEIGHTS = {
  strength: 0.48,
  breadth: 0.42,
} as const;

/** Central Weekly Pulse weights when holding breadth is available. */
export const WEEKLY_PULSE_WEIGHTS_WITH_BREADTH = {
  strength: 0.5,
  consistency: 0.25,
  breadth: 0.25,
} as const;

/** Central Weekly Pulse weights when breadth is unavailable. */
export const WEEKLY_PULSE_WEIGHTS_RETURN_ONLY = {
  strength: 0.62,
  consistency: 0.38,
} as const;

/** Central Monthly Pulse weights. */
export const MONTHLY_PULSE_WEIGHTS = {
  strength: 0.45,
  consistency: 0.2,
  structure: 0.35,
} as const;

/** When Resilience is present, blend into Monthly structure. */
export const MONTHLY_STRUCTURE_RESILIENCE_BLEND = {
  resilience: 0.7,
  concentration: 0.3,
} as const;

const DAILY_LABELS = [
  "Stressed",
  "Weak",
  "Mixed",
  "Positive",
  "Strong",
] as const;

const WEEKLY_LABELS = [
  "Weakening",
  "Mixed",
  "Stable",
  "Improving",
  "Strong trend",
] as const;

const MONTHLY_LABELS = [
  "Sensitive",
  "Constrained",
  "Balanced",
  "Improving",
  "Strong structure",
] as const;

const TONES: ScoreBandTone[] = [
  "fragile",
  "attention",
  "balanced",
  "strong",
  "resilient",
];

function bandsFromLabels(
  labels: readonly string[],
  prefix: string,
): ScoreBandDefinition[] {
  return SCORE_BAND_EDGES.map((edge, index) => ({
    id: `${prefix}-${index}`,
    min: edge.min,
    max: edge.max,
    label: labels[index]!,
    tone: TONES[index]!,
  }));
}

export const DAILY_SCORE_BANDS = bandsFromLabels(DAILY_LABELS, "daily");
export const WEEKLY_SCORE_BANDS = bandsFromLabels(WEEKLY_LABELS, "weekly");
export const MONTHLY_SCORE_BANDS = bandsFromLabels(MONTHLY_LABELS, "monthly");
