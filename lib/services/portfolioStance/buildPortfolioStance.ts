/**
 * Deterministic Portfolio Stance scoring.
 * Overlap is handled by exclusive factors — crypto is not counted four times.
 */

import { EXPOSURE_GROUP_LABELS } from "@/lib/services/classification/types";
import type { ExposureGroupId } from "@/lib/services/classification/types";
import {
  clampScore,
  interpolateAnchors,
  roundScore,
} from "@/lib/services/portfolio/healthScore/math";
import {
  ASSET_POSTURE_TENDENCY,
  bandFromStanceScore,
  CONCENTRATION_STABILIZING_SCORE,
  CONCENTRATION_STANCE_ANCHORS,
  confidenceFromCoverage,
  DIVERSIFICATION_STANCE_ANCHORS,
  SENSITIVITY_STANCE_ANCHORS,
  STANCE_FACTOR_WEIGHTS,
  STANCE_POSITIONING_DISCLAIMER,
} from "@/lib/services/portfolioStance/config";
import type {
  PortfolioStance,
  StanceDriver,
  StanceFactor,
  StanceFactorId,
  StanceInputs,
} from "@/lib/services/portfolioStance/types";
import { assertNoStanceAdvisoryLanguage } from "@/lib/services/portfolioStance/wording";

const FACTOR_LABELS: Record<StanceFactorId, string> = {
  asset_posture: "Asset posture",
  concentration: "Concentration",
  modeled_sensitivity: "Modeled sensitivity",
  diversification: "Diversification",
};

function groupWeight(
  inputs: StanceInputs,
  id: ExposureGroupId,
): number {
  return inputs.groupWeights[id] ?? 0;
}

function scoreAssetPosture(inputs: StanceInputs): number | null {
  let weighted = 0;
  let classified = 0;
  for (const [id, tendency] of Object.entries(ASSET_POSTURE_TENDENCY) as Array<
    [Exclude<ExposureGroupId, "other_unclassified">, number]
  >) {
    const weight = groupWeight(inputs, id);
    if (weight <= 0) continue;
    weighted += weight * tendency;
    classified += weight;
  }
  if (!(classified > 0)) return null;
  return clampScore(weighted / classified);
}

function scoreConcentration(inputs: StanceInputs): number | null {
  const largest = inputs.largestHoldingWeightPercent;
  if (largest == null || !Number.isFinite(largest)) return null;
  if (inputs.largestHoldingIsStabilizing) {
    return CONCENTRATION_STABILIZING_SCORE;
  }
  return clampScore(interpolateAnchors(largest, CONCENTRATION_STANCE_ANCHORS));
}

function scoreSensitivity(inputs: StanceInputs): number | null {
  if (
    inputs.modeledImpactPercent == null ||
    !Number.isFinite(inputs.modeledImpactPercent)
  ) {
    return null;
  }
  return clampScore(
    interpolateAnchors(
      Math.abs(inputs.modeledImpactPercent),
      SENSITIVITY_STANCE_ANCHORS,
    ),
  );
}

function scoreDiversification(inputs: StanceInputs): number | null {
  if (!inputs.portfolioValueAvailable) return null;
  const count = Math.max(1, inputs.distinctClassifiedGroupCount);
  return clampScore(
    interpolateAnchors(count, DIVERSIFICATION_STANCE_ANCHORS),
  );
}

function allocateContributionPoints(
  rows: Array<{ id: StanceFactorId; weight: number; score: number }>,
  total: number,
): Record<StanceFactorId, number> {
  const exact = rows.map((row) => ({
    id: row.id,
    value: (row.weight / rows.reduce((sum, item) => sum + item.weight, 0)) * row.score,
  }));
  const floors = exact.map((row) => ({
    id: row.id,
    floor: Math.floor(row.value),
    fraction: row.value - Math.floor(row.value),
  }));
  let remainder = total - floors.reduce((sum, row) => sum + row.floor, 0);
  const byFraction = [...floors].sort((left, right) => {
    if (right.fraction !== left.fraction) return right.fraction - left.fraction;
    return left.id.localeCompare(right.id);
  });
  const result = Object.fromEntries(
    floors.map((row) => [row.id, row.floor]),
  ) as Record<StanceFactorId, number>;
  for (const row of byFraction) {
    if (remainder <= 0) break;
    result[row.id] += 1;
    remainder -= 1;
  }
  return result;
}

function buildDrivers(inputs: StanceInputs): StanceDriver[] {
  const candidates: Array<StanceDriver & { influence: number }> = [];
  const crypto = groupWeight(inputs, "crypto");
  if (crypto >= 8) {
    candidates.push({
      id: "crypto",
      polarity: "offensive",
      label: "Crypto exposure",
      valueLabel: `${Math.round(crypto)}%`,
      effect: "pulls stance more offensive",
      influence: crypto * 1.2,
    });
  }
  const largest = inputs.largestHoldingWeightPercent;
  if (
    largest != null &&
    largest >= 20 &&
    !inputs.largestHoldingIsStabilizing
  ) {
    candidates.push({
      id: "largest-holding",
      polarity: "offensive",
      label: inputs.largestHoldingLabel
        ? `Largest holding · ${inputs.largestHoldingLabel}`
        : "Largest holding",
      valueLabel: `${Math.round(largest)}%`,
      effect: "pulls stance more offensive",
      influence: Math.max(0, largest - 12) * 0.85,
    });
  }
  const cash = groupWeight(inputs, "cash");
  if (cash >= 8) {
    candidates.push({
      id: "cash",
      polarity: "defensive",
      label: "Cash",
      valueLabel: `${Math.round(cash)}%`,
      effect: "moderates stance",
      influence: cash * 0.95,
    });
  }
  const fixedIncome = groupWeight(inputs, "fixed_income");
  if (fixedIncome >= 10) {
    candidates.push({
      id: "fixed-income",
      polarity: "defensive",
      label: EXPOSURE_GROUP_LABELS.fixed_income,
      valueLabel: `${Math.round(fixedIncome)}%`,
      effect: "moderates stance",
      influence: fixedIncome * 0.75,
    });
  }
  const tech = groupWeight(inputs, "technology_communication");
  const resources = groupWeight(inputs, "industrials_resources");
  const thematic = tech + resources;
  if (thematic >= 15) {
    candidates.push({
      id: "thematic-equity",
      polarity: "offensive",
      label: tech >= resources ? EXPOSURE_GROUP_LABELS.technology_communication : EXPOSURE_GROUP_LABELS.industrials_resources,
      valueLabel: `${Math.round(Math.max(tech, resources))}%`,
      effect: "pulls stance more offensive",
      influence: thematic * 0.55,
    });
  }
  if (
    inputs.modeledImpactPercent != null &&
    Math.abs(inputs.modeledImpactPercent) >= 8
  ) {
    const impact = inputs.modeledImpactPercent;
    candidates.push({
      id: "modeled-sensitivity",
      polarity: "offensive",
      label: "Modeled sensitivity",
      valueLabel: `${impact > 0 ? "+" : ""}${impact.toFixed(1)}%`,
      effect: "pulls stance more offensive",
      influence: Math.abs(impact) * 0.55,
    });
  }

  return candidates
    .sort((left, right) => right.influence - left.influence)
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      polarity: row.polarity,
      label: row.label,
      valueLabel: row.valueLabel,
      effect: row.effect,
    }));
}

function buildConclusion(input: {
  bandLabel: string;
  drivers: StanceDriver[];
}): string {
  const offensive = input.drivers.filter((row) => row.polarity === "offensive");
  const defensive = input.drivers.filter((row) => row.polarity === "defensive");
  const band = input.bandLabel.toLowerCase();

  if (offensive.length >= 2) {
    return `Your portfolio currently has a ${band} stance, mainly because ${offensive[0]!.label.toLowerCase()} and ${offensive[1]!.label.toLowerCase()} dominate the current mix.`;
  }
  if (offensive.length === 1 && defensive.length >= 1) {
    return `Your portfolio currently has a ${band} stance, with ${offensive[0]!.label.toLowerCase()} balanced by ${defensive[0]!.label.toLowerCase()}.`;
  }
  if (defensive.length >= 1 && offensive.length === 0) {
    return `Your portfolio is ${band} in its current positioning, largely because ${defensive.map((row) => row.label.toLowerCase()).join(" and ")} represent a large share.`;
  }
  if (band.includes("neutral")) {
    return "Your portfolio is currently close to neutral, with diversified equities balanced by cash and fixed income.";
  }
  return `Your portfolio currently has a ${band} stance based on the current mix, concentration, and modeled sensitivity.`;
}

export function buildPortfolioStanceFromInputs(
  inputs: StanceInputs,
): PortfolioStance {
  if (!inputs.portfolioValueAvailable) {
    const empty: PortfolioStance = {
      status: "unavailable",
      score: null,
      bandId: null,
      bandLabel: null,
      confidence: "limited",
      factors: [],
      drivers: [],
      conclusion:
        "Portfolio stance appears once this portfolio has a valued mix.",
      disclaimer: STANCE_POSITIONING_DISCLAIMER,
      inputs,
    };
    assertNoStanceAdvisoryLanguage([empty.conclusion, empty.disclaimer]);
    return empty;
  }

  const raw: Array<{
    id: StanceFactorId;
    score: number | null;
    explanation: string;
  }> = [
    {
      id: "asset_posture",
      score: scoreAssetPosture(inputs),
      explanation:
        groupWeight(inputs, "cash") + groupWeight(inputs, "fixed_income") >= 8
          ? "Cash and fixed income reduce the share of the portfolio directly exposed to the modeled equity/crypto shocks. Unclassified weight is not redistributed."
          : "Classified asset mix using conservative stance tendencies. Unclassified weight is not redistributed.",
    },
    {
      id: "concentration",
      score: scoreConcentration(inputs),
      explanation: inputs.largestHoldingIsStabilizing
        ? "Largest-holding concentration is not treated as an offensive tilt when that holding is cash, fixed income, or unclassified."
        : `Largest holding weight uses a smooth scale. ${inputs.largestHoldingLabel ?? "The largest holding"} currently represents ${inputs.largestHoldingWeightPercent?.toFixed(1) ?? "n/a"}%.`,
    },
    {
      id: "modeled_sensitivity",
      score: scoreSensitivity(inputs),
      explanation:
        inputs.modeledImpactPercent == null
          ? "Modeled sensitivity is unavailable for this checkpoint."
          : `Most impactful supported modeled scenario: ${inputs.modeledScenarioName ?? "modeled scenario"} (${inputs.modeledImpactPercent.toFixed(1)}%). This is modeled sensitivity, not expected loss.`,
    },
    {
      id: "diversification",
      score: scoreDiversification(inputs),
      explanation: `Classified exposure sleeves with a meaningful weight: ${inputs.distinctClassifiedGroupCount}. More sleeves pull this factor toward neutral.`,
    },
  ];

  const applicable = raw.filter(
    (row) => row.score != null && Number.isFinite(row.score),
  ) as Array<{ id: StanceFactorId; score: number; explanation: string }>;

  if (applicable.length === 0) {
    const empty: PortfolioStance = {
      status: "unavailable",
      score: null,
      bandId: null,
      bandLabel: null,
      confidence: "limited",
      factors: [],
      drivers: [],
      conclusion:
        "Portfolio stance cannot be assessed from the available mix yet.",
      disclaimer: STANCE_POSITIONING_DISCLAIMER,
      inputs,
    };
    assertNoStanceAdvisoryLanguage([empty.conclusion, empty.disclaimer]);
    return empty;
  }

  const weighted = applicable.map((row) => ({
    ...row,
    weight: STANCE_FACTOR_WEIGHTS[row.id],
  }));
  const weightSum = weighted.reduce((sum, row) => sum + row.weight, 0);
  const exactScore = weighted.reduce(
    (sum, row) => sum + (row.score * row.weight) / weightSum,
    0,
  );
  const score = roundScore(exactScore);
  const band = bandFromStanceScore(score);
  const contributions = allocateContributionPoints(weighted, score);

  const factors: StanceFactor[] = raw.map((row) => {
    const weight = STANCE_FACTOR_WEIGHTS[row.id];
    const contribution = row.score == null ? 0 : contributions[row.id] ?? 0;
    const vsNeutral =
      row.score == null ? 0 : ((row.score - 50) * weight) / weightSum;
    return {
      id: row.id,
      label: FACTOR_LABELS[row.id],
      score: row.score == null ? null : roundScore(row.score),
      weight,
      applicable: row.score != null,
      contributionPoints: contribution,
      vsNeutralPoints: Math.round(vsNeutral * 10) / 10,
      explanation: row.explanation,
    };
  });

  const drivers = buildDrivers(inputs);
  const conclusion = buildConclusion({ bandLabel: band.label, drivers });
  const confidence = confidenceFromCoverage({
    unclassifiedWeightPercent: inputs.unclassifiedWeightPercent,
    portfolioValueAvailable: inputs.portfolioValueAvailable,
    scenarioSupported: scoreSensitivity(inputs) != null,
  });

  const result: PortfolioStance = {
    status: "ready",
    score,
    bandId: band.id,
    bandLabel: band.label,
    confidence,
    factors,
    drivers,
    conclusion,
    disclaimer: STANCE_POSITIONING_DISCLAIMER,
    inputs,
  };

  assertNoStanceAdvisoryLanguage([
    result.conclusion,
    result.disclaimer,
    ...result.factors.map((factor) => factor.explanation),
    ...result.drivers.map((driver) => `${driver.label} ${driver.effect}`),
  ]);

  const contributionSum = result.factors.reduce(
    (sum, factor) => sum + (factor.applicable ? factor.contributionPoints : 0),
    0,
  );
  if (contributionSum !== score) {
    throw new Error(
      `Stance contribution points (${contributionSum}) must reconcile to score (${score}).`,
    );
  }

  return result;
}
