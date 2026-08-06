/**
 * Daily / Weekly Portfolio Score bands and versions.
 * Reuses central ScoreBandTone tokens from the structural scorecard.
 */

import {
  SCORE_BAND_EDGES,
  type ScoreBandDefinition,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";

export const DAILY_PORTFOLIO_SCORE_VERSION = "dps-v1" as const;
export const WEEKLY_PORTFOLIO_SCORE_VERSION = "wps-v1" as const;

const DAILY_LABELS = [
  "Weak session",
  "Mixed session",
  "Stable session",
  "Strong session",
  "Broadly strong session",
] as const;

const WEEKLY_LABELS = [
  "Weak week",
  "Mixed week",
  "Positive week",
  "Strong week",
  "Broadly strong week",
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
