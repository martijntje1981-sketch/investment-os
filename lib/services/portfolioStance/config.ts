/**
 * Canonical Portfolio Stance thresholds and weights.
 * Descriptive positioning of the actual portfolio — not risk tolerance or advice.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { StanceBandId, StanceConfidence } from "@/lib/services/portfolioStance/types";

/** Factor weights for the master stance score (must sum to 1). */
export const STANCE_FACTOR_WEIGHTS = {
  asset_posture: 0.4,
  concentration: 0.25,
  modeled_sensitivity: 0.2,
  diversification: 0.15,
} as const;

/**
 * Conservative stance tendencies for classified groups (0 = defensive, 100 = offensive).
 * Unclassified is excluded from the weighted average — it lowers confidence instead.
 */
export const ASSET_POSTURE_TENDENCY: Record<
  Exclude<ExposureGroupId, "other_unclassified">,
  number
> = {
  cash: 6,
  fixed_income: 18,
  precious_metals: 48,
  diversified_equity: 58,
  healthcare: 60,
  consumer: 60,
  financials_real_estate: 62,
  industrials_resources: 68,
  technology_communication: 74,
  crypto: 92,
};

/**
 * Largest-holding weight → offensive concentration contribution.
 * Smooth anchors: 12% little effect, 35% moderate, 55% strong.
 * Not applied when the largest holding is cash, fixed income, or unclassified.
 */
export const CONCENTRATION_STANCE_ANCHORS = [
  { at: 8, score: 48 },
  { at: 12, score: 50 },
  { at: 20, score: 56 },
  { at: 35, score: 68 },
  { at: 50, score: 80 },
  { at: 55, score: 84 },
  { at: 70, score: 92 },
  { at: 100, score: 98 },
] as const;

/** When concentration must not assume an offensive tilt (cash / FI / unknown). */
export const CONCENTRATION_STABILIZING_SCORE = 22;

/**
 * Absolute portfolio impact % from the worst supported scenario → stance.
 * Larger |impact| → more offensive. Labelled modeled sensitivity, not expected loss.
 */
export const SENSITIVITY_STANCE_ANCHORS = [
  { at: 0, score: 22 },
  { at: 4, score: 48 },
  { at: 8, score: 58 },
  { at: 12, score: 68 },
  { at: 18, score: 78 },
  { at: 30, score: 90 },
  { at: 45, score: 96 },
] as const;

/**
 * Distinct classified sleeves → stance. More sleeves pull toward neutral.
 * Cash/FI moderation lives in asset posture, not here (avoids double-counting cash).
 */
export const DIVERSIFICATION_STANCE_ANCHORS = [
  { at: 1, score: 52 },
  { at: 2, score: 50 },
  { at: 3, score: 48 },
  { at: 4, score: 45 },
  { at: 6, score: 42 },
] as const;

/**
 * User-facing bands. Validated against fixture portfolios:
 * 100% cash stays Defensive; 100% global equity stays Moderately offensive.
 */
export const STANCE_BANDS: ReadonlyArray<{
  id: StanceBandId;
  minScore: number;
  maxScore: number;
  label: string;
}> = [
  { id: "defensive", minScore: 0, maxScore: 24, label: "Defensive" },
  {
    id: "moderately_defensive",
    minScore: 25,
    maxScore: 44,
    label: "Moderately defensive",
  },
  { id: "neutral", minScore: 45, maxScore: 55, label: "Neutral" },
  {
    id: "moderately_offensive",
    minScore: 56,
    maxScore: 75,
    label: "Moderately offensive",
  },
  { id: "offensive", minScore: 76, maxScore: 100, label: "Offensive" },
] as const;

/** Announce a stance change only when the score moved this far, or the zone changed. */
export const STANCE_CHANGE_MATERIAL_SCORE = 6;

export const STANCE_CONFIDENCE_UNCLASSIFIED_HIGH_MAX = 5;
export const STANCE_CONFIDENCE_UNCLASSIFIED_MEDIUM_MAX = 20;

export const STANCE_POSITIONING_DISCLAIMER =
  "Portfolio stance describes how the portfolio is positioned, not whether it is good or bad.";

export const STANCE_HISTORY_BUILDING =
  "Stance history is building.";

export const STANCE_ILLUSTRATIVE_DISCLAIMER =
  "Illustrative scenario — not a forecast or recommendation.";

export const STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON =
  "Return assumptions by stance require a separate defensible methodology before stance can be used to model goal completion.";

/** Illustrative sensitivity scale only — not a model portfolio. */
export const STANCE_SENSITIVITY_ILLUSTRATION = {
  moreDefensive: 0.65,
  moreOffensive: 1.35,
} as const;

export const STANCE_FRAMING = STANCE_POSITIONING_DISCLAIMER;

export function bandFromStanceScore(score: number): {
  id: StanceBandId;
  label: string;
} {
  for (let index = STANCE_BANDS.length - 1; index >= 0; index -= 1) {
    const band = STANCE_BANDS[index]!;
    if (score >= band.minScore) {
      return { id: band.id, label: band.label };
    }
  }
  return { id: "defensive", label: "Defensive" };
}

export function confidenceFromCoverage(input: {
  unclassifiedWeightPercent: number;
  portfolioValueAvailable: boolean;
  scenarioSupported: boolean;
}): StanceConfidence {
  if (
    !input.portfolioValueAvailable ||
    input.unclassifiedWeightPercent >= STANCE_CONFIDENCE_UNCLASSIFIED_MEDIUM_MAX
  ) {
    return "limited";
  }
  if (
    input.unclassifiedWeightPercent <= STANCE_CONFIDENCE_UNCLASSIFIED_HIGH_MAX &&
    input.scenarioSupported
  ) {
    return "high";
  }
  return "medium";
}
