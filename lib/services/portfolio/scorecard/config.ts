/**
 * Portfolio Scorecard — shared bands, colors, version.
 */

export const PORTFOLIO_SCORECARD_VERSION = "psc-v1" as const;

export type PortfolioScoreId = "health" | "goal" | "momentum" | "readiness";

export type ScoreBandTone =
  "fragile" | "attention" | "balanced" | "strong" | "resilient";

export type ScoreConfidenceLevel = "high" | "moderate" | "limited";

export type ScoreBandDefinition = {
  id: string;
  min: number;
  max: number;
  label: string;
  tone: ScoreBandTone;
};

/** Shared numeric band edges — labels differ per score. */
export const SCORE_BAND_EDGES = [
  { min: 0, max: 39 },
  { min: 40, max: 59 },
  { min: 60, max: 74 },
  { min: 75, max: 89 },
  { min: 90, max: 100 },
] as const;

export const HEALTH_SCORE_BAND_LABELS = [
  "Structurally fragile",
  "Needs attention",
  "Balanced foundation",
  "Strong structure",
  "Highly resilient structure",
] as const;

export const GOAL_SCORE_BAND_LABELS = [
  "Materially off track",
  "Behind plan",
  "Developing",
  "On track",
  "Strongly on track",
] as const;

export const MOMENTUM_SCORE_BAND_LABELS = [
  "Weak",
  "Mixed",
  "Positive",
  "Strong",
  "Broadly strong",
] as const;

export const READINESS_SCORE_BAND_LABELS = [
  "Limited setup",
  "Developing setup",
  "Useful coverage",
  "High readiness",
  "Complete foundation",
] as const;

/** Tailwind classes for ring stroke / accent by tone. */
export const SCORE_TONE_RING_CLASS: Record<ScoreBandTone, string> = {
  fragile: "text-rose-500",
  attention: "text-amber-500",
  balanced: "text-sky-500",
  strong: "text-emerald-500",
  resilient: "text-emerald-600",
};

/** Lighter ring strokes for premium-blue (on-dark) heroes. */
export const SCORE_TONE_RING_ON_DARK_CLASS: Record<ScoreBandTone, string> = {
  fragile: "text-rose-300",
  attention: "text-amber-300",
  balanced: "text-sky-300",
  strong: "text-emerald-300",
  resilient: "text-emerald-200",
};

export const SCORE_TONE_TRACK_CLASS = "text-slate-200";

export const SCORE_TONE_LABEL_CLASS: Record<ScoreBandTone, string> = {
  fragile: "text-rose-700",
  attention: "text-amber-700",
  balanced: "text-sky-700",
  strong: "text-emerald-700",
  resilient: "text-emerald-800",
};

export function buildBands(
  labels: readonly string[],
  toneOrder: readonly ScoreBandTone[] = [
    "fragile",
    "attention",
    "balanced",
    "strong",
    "resilient",
  ],
): ScoreBandDefinition[] {
  return SCORE_BAND_EDGES.map((edge, index) => ({
    id: `${toneOrder[index]}-${edge.min}-${edge.max}`,
    min: edge.min,
    max: edge.max,
    label: labels[index] ?? "Unknown",
    tone: toneOrder[index] ?? "balanced",
  }));
}

export const HEALTH_BANDS = buildBands(HEALTH_SCORE_BAND_LABELS);
export const GOAL_BANDS = buildBands(GOAL_SCORE_BAND_LABELS);
export const MOMENTUM_BANDS = buildBands(MOMENTUM_SCORE_BAND_LABELS);
export const READINESS_BANDS = buildBands(READINESS_SCORE_BAND_LABELS);

export function resolveBand(
  value: number,
  bands: ScoreBandDefinition[],
): ScoreBandDefinition {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    bands.find((band) => clamped >= band.min && clamped <= band.max) ??
    bands[0]!
  );
}
