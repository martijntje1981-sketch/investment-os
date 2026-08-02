/**
 * Portfolio Health Score v1 — main builder.
 */

import {
  HEALTH_SCORE_BANDS,
  HEALTH_SCORE_BASE_WEIGHTS,
  HEALTH_SCORE_DIMENSION_LABELS,
  HEALTH_SCORE_DISCLAIMER,
  PORTFOLIO_HEALTH_SCORE_VERSION,
  type HealthScoreDimensionId,
} from "@/lib/services/portfolio/healthScore/config";
import { buildHealthScoreConfidence } from "@/lib/services/portfolio/healthScore/confidence";
import {
  scoreConcentrationDimension,
  scoreDiversificationDimension,
  scoreGoalAlignmentDimension,
  scoreIncomeAlignmentDimension,
  scoreLiquidityCashDimension,
  scoreRiskBalanceDimension,
  statusFromScore,
} from "@/lib/services/portfolio/healthScore/dimensions";
import { buildPortfolioHealthFingerprint } from "@/lib/services/portfolio/healthScore/fingerprint";
import {
  clampScore,
  roundScore,
} from "@/lib/services/portfolio/healthScore/math";
import type {
  HealthScoreBandResult,
  HealthScoreDimensionResult,
  HealthScoreFactor,
  PortfolioHealthScoreInput,
  PortfolioHealthScoreResult,
} from "@/lib/services/portfolio/healthScore/types";

function resolveBand(score: number): HealthScoreBandResult {
  const band =
    HEALTH_SCORE_BANDS.find(
      (entry) => score >= entry.min && score <= entry.max,
    ) ?? HEALTH_SCORE_BANDS[0]!;
  return {
    id: band.id,
    label: band.label,
    explanation: band.explanation,
    tone: band.tone,
    min: band.min,
    max: band.max,
  };
}

function pickStrengthsAndAttention(dimensions: HealthScoreDimensionResult[]): {
  strengths: HealthScoreFactor[];
  attentionPoints: HealthScoreFactor[];
} {
  const applicable = dimensions.filter(
    (dimension) => dimension.applicable && dimension.score != null,
  );
  const byScoreDesc = [...applicable].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );
  const byScoreAsc = [...applicable].sort(
    (a, b) => (a.score ?? 0) - (b.score ?? 0),
  );

  const strengths: HealthScoreFactor[] = byScoreDesc
    .slice(0, 2)
    .map((dimension) => ({
      id: `strength-${dimension.id}`,
      dimensionId: dimension.id,
      title: dimension.label,
      detail: dimension.evidence[0]?.text ?? dimension.explanation,
      scoreImpact: "positive" as const,
    }));

  const attentionPoints: HealthScoreFactor[] = byScoreAsc
    .filter((dimension) => (dimension.score ?? 100) < 75)
    .slice(0, 2)
    .map((dimension) => ({
      id: `attention-${dimension.id}`,
      dimensionId: dimension.id,
      title: dimension.label,
      detail: dimension.evidence[0]?.text ?? dimension.explanation,
      scoreImpact: "negative" as const,
    }));

  return { strengths, attentionPoints };
}

function buildImprovementDrivers(
  dimensions: HealthScoreDimensionResult[],
): string[] {
  const weak = dimensions
    .filter(
      (dimension) =>
        dimension.applicable && dimension.score != null && dimension.score < 65,
    )
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  return weak.slice(0, 3).map((dimension) => {
    switch (dimension.id) {
      case "concentration":
        return "A lower single-holding concentration would improve the concentration dimension.";
      case "diversification":
        return "Adding economically different exposures would improve diversification.";
      case "risk_balance":
        return "Closer alignment between portfolio volatility and goal timing would improve risk balance.";
      case "goal_alignment":
        return "Goal alignment would improve if risk assumptions and horizon were closer to the portfolio’s current identity.";
      case "liquidity_cash":
        return "Adjusting cash resilience relative to the goal horizon would improve the liquidity dimension.";
      case "income_alignment":
        return "Income alignment would improve if distributing exposures better matched the passive-income goal.";
      default:
        return `${dimension.label} is a structural area to monitor.`;
    }
  });
}

function buildExplanation(
  score: number,
  band: HealthScoreBandResult,
  strengths: HealthScoreFactor[],
  attentionPoints: HealthScoreFactor[],
  confidenceLabel: string,
): string {
  const strengthText = strengths[0]
    ? `Strength: ${strengths[0].title.toLowerCase()}.`
    : "";
  const attentionText = attentionPoints[0]
    ? `Attention: ${attentionPoints[0].title.toLowerCase()}.`
    : "";
  return [
    `Portfolio Health Score is ${score}/100 (${band.label}).`,
    band.explanation,
    strengthText,
    attentionText,
    `Confidence: ${confidenceLabel}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Deterministic, versioned Portfolio Health Score (0–100).
 * Same inputs always produce the same score.
 */
export function buildPortfolioHealthScoreV1(
  input: PortfolioHealthScoreInput,
): PortfolioHealthScoreResult {
  const calculatedAt = (input.now ?? new Date()).toISOString();
  const fingerprint = buildPortfolioHealthFingerprint(input);
  const confidence = buildHealthScoreConfidence(input);

  if (!input.profile.hasValuedPortfolio || input.analysis.totalValue <= 0) {
    const emptyBand = resolveBand(0);
    return {
      version: PORTFOLIO_HEALTH_SCORE_VERSION,
      score: 0,
      band: emptyBand,
      dimensions: [],
      strengths: [],
      attentionPoints: [],
      improvementDrivers: [
        "Add valued holdings to calculate a structural Portfolio Health Score.",
      ],
      confidence,
      explanation:
        "Portfolio Health Score requires valued holdings. Add positions with reliable prices to unlock structural scoring.",
      calculatedAt,
      fingerprint,
      hasValuedPortfolio: false,
      portfolioIdentity: null,
      disclaimer: HEALTH_SCORE_DISCLAIMER,
    };
  }

  const drafts = [
    scoreConcentrationDimension(input.analysis),
    scoreDiversificationDimension(
      input.exposure,
      input.profile,
      input.analysis,
    ),
    scoreRiskBalanceDimension(input),
    scoreGoalAlignmentDimension(input),
    scoreLiquidityCashDimension(input),
    scoreIncomeAlignmentDimension(input),
  ];

  const applicable = drafts.filter((draft) => draft.applicable);
  const applicableWeightSum = applicable.reduce(
    (sum, draft) => sum + HEALTH_SCORE_BASE_WEIGHTS[draft.id],
    0,
  );

  const dimensions: HealthScoreDimensionResult[] = drafts.map((draft) => {
    const baseWeight = draft.applicable
      ? HEALTH_SCORE_BASE_WEIGHTS[draft.id]
      : 0;
    const effectiveWeight =
      draft.applicable && applicableWeightSum > 0
        ? (baseWeight / applicableWeightSum) * 100
        : 0;
    const score =
      draft.applicable && draft.rawScore != null
        ? roundScore(draft.rawScore)
        : null;
    const contribution = score != null ? (score * effectiveWeight) / 100 : 0;

    return {
      id: draft.id,
      label: HEALTH_SCORE_DIMENSION_LABELS[draft.id],
      applicable: draft.applicable,
      baseWeight,
      effectiveWeight: Number(effectiveWeight.toFixed(2)),
      rawScore: draft.rawScore,
      score,
      contribution: Number(contribution.toFixed(2)),
      status:
        draft.applicable && score != null
          ? statusFromScore(score)
          : "not_applicable",
      evidence: draft.evidence,
      explanation: draft.explanation,
    };
  });

  const totalScore = roundScore(
    dimensions.reduce((sum, dimension) => sum + dimension.contribution, 0),
  );
  const band = resolveBand(totalScore);
  const { strengths, attentionPoints } = pickStrengthsAndAttention(dimensions);
  const improvementDrivers = buildImprovementDrivers(dimensions);

  return {
    version: PORTFOLIO_HEALTH_SCORE_VERSION,
    score: clampScore(totalScore),
    band,
    dimensions,
    strengths,
    attentionPoints,
    improvementDrivers,
    confidence,
    explanation: buildExplanation(
      totalScore,
      band,
      strengths,
      attentionPoints,
      confidence.label,
    ),
    calculatedAt,
    fingerprint,
    hasValuedPortfolio: true,
    portfolioIdentity: input.profile.hero.identity,
    disclaimer: HEALTH_SCORE_DISCLAIMER,
  };
}

export function getDimension(
  result: PortfolioHealthScoreResult,
  id: HealthScoreDimensionId,
): HealthScoreDimensionResult | undefined {
  return result.dimensions.find((dimension) => dimension.id === id);
}
