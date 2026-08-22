/**
 * Phase 2C — build Resilience / Sleep Well profile.
 * Deterministic; does not mutate holdings or goals.
 */

import { buildGoalSensitivityFromScenario } from "@/lib/services/goalSensitivity";
import {
  bandFromScore,
  RESILIENCE_ASSUMPTIONS,
  RESILIENCE_FACTOR_WEIGHTS,
  RESILIENCE_LIMITATIONS,
} from "@/lib/services/resilience/config";
import {
  collectResilienceInputs,
  pickMostSensitiveScenario,
  scoreCashBufferFactor,
  scoreConcentrationFactor,
  scoreDiversificationFactor,
  scoreScenarioSensitivityFactor,
} from "@/lib/services/resilience/factors";
import type {
  ResilienceFactor,
  ResilienceFactorId,
  ResilienceProfile,
} from "@/lib/services/resilience/types";
import { assertNoAdvisoryLanguage } from "@/lib/services/resilience/wording";
import { runRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import { roundScore } from "@/lib/services/portfolio/healthScore/math";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function composeMasterScore(factors: ResilienceFactor[]): number | null {
  let weightSum = 0;
  let scoreSum = 0;

  for (const factor of factors) {
    if (!factor.applicable || factor.score === null) continue;
    const weight = RESILIENCE_FACTOR_WEIGHTS[factor.id];
    weightSum += weight;
    scoreSum += factor.score * weight;
  }

  if (weightSum <= 0) return null;
  return roundScore(scoreSum / weightSum);
}

function pickPrimaryDriver(factors: ResilienceFactor[]): {
  id: ResilienceFactorId | null;
  explanation: string | null;
} {
  const applicable = factors.filter(
    (factor) => factor.applicable && factor.score !== null,
  );
  if (applicable.length === 0) {
    return { id: null, explanation: null };
  }

  const lowest = applicable.reduce((best, row) =>
    (row.score ?? 100) < (best.score ?? 100) ? row : best,
  );

  return {
    id: lowest.id,
    explanation: `${lowest.label} is the main factor currently reducing resilience. ${lowest.explanation}`,
  };
}

/**
 * Build a Sleep Well / resilience profile from current holdings (+ optional goal).
 */
export function buildResilienceProfile(input: {
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}): ResilienceProfile {
  const assumptions = [...RESILIENCE_ASSUMPTIONS];
  const limitations = [...RESILIENCE_LIMITATIONS];
  const hasSavedGoal = Boolean(input.hasSavedGoal && input.goal);
  const goal = hasSavedGoal ? input.goal! : null;

  const scenarioResults = runRelevantPortfolioScenarios(input.holdings);
  const inputs = collectResilienceInputs(input.holdings);
  const hasValue = inputs.analysis.totalValue > 0;

  if (!hasValue) {
    const empty: ResilienceProfile = {
      status: "insufficient_data",
      score: null,
      bandId: null,
      bandLabel: null,
      summary:
        "Resilience cannot be assessed yet — add valued holdings to see how the current structure absorbs modeled shocks.",
      factors: [
        scoreConcentrationFactor(inputs.analysis),
        scoreDiversificationFactor(inputs),
        scoreCashBufferFactor(inputs.cashWeight, false),
        scoreScenarioSensitivityFactor(scenarioResults),
      ],
      primaryDriver: null,
      primaryDriverExplanation: null,
      mostSensitive: null,
      goalContext: null,
      scenarioResults,
      assumptions,
      limitations,
    };
    assertNoAdvisoryLanguage([
      empty.summary,
      ...empty.assumptions,
      ...empty.limitations,
      ...empty.factors.map((factor) => factor.explanation),
    ]);
    return empty;
  }

  const factors: ResilienceFactor[] = [
    scoreConcentrationFactor(inputs.analysis),
    scoreDiversificationFactor(inputs),
    scoreCashBufferFactor(inputs.cashWeight, true),
    scoreScenarioSensitivityFactor(scenarioResults),
  ];

  const score = composeMasterScore(factors);
  const band = score === null ? null : bandFromScore(score);
  const driver = pickPrimaryDriver(factors);
  const most = pickMostSensitiveScenario(scenarioResults);

  let goalContext: ResilienceProfile["goalContext"] = null;
  if (hasSavedGoal && goal && most) {
    const scenario = scenarioResults.find(
      (row) => row.scenarioId === most.scenarioId,
    );
    if (scenario) {
      const sensitivity = buildGoalSensitivityFromScenario({
        scenarioResult: scenario,
        goal,
        hasSavedGoal: true,
        currentPortfolioValue: inputs.analysis.totalValue,
      });
      if (
        sensitivity.status === "ok" &&
        sensitivity.currentProgressPercent !== null &&
        sensitivity.stressedProgressPercent !== null
      ) {
        goalContext = {
          scenarioId: most.scenarioId,
          scenarioName: most.scenarioName,
          currentProgressPercent: sensitivity.currentProgressPercent,
          stressedProgressPercent: sensitivity.stressedProgressPercent,
          summary: `Under your most impactful modeled scenario (${most.scenarioName}), goal progress would move from ${sensitivity.currentProgressPercent.toFixed(1)}% to ${sensitivity.stressedProgressPercent.toFixed(1)}%.`,
        };
      }
    }
  }

  const mostSensitive = most
    ? {
        ...most,
        note: "Among currently supported modeled scenarios only — not a claim about the worst possible real-world event.",
      }
    : null;

  const summary =
    score === null || !band
      ? "Resilience factors are partially available from the current portfolio structure."
      : `Structural resilience is ${band.label.toLowerCase()} (${score}/100) based on concentration, diversification, cash buffer, and supported scenario sensitivity.`;

  const profile: ResilienceProfile = {
    status: "ok",
    score,
    bandId: band?.id ?? null,
    bandLabel: band?.label ?? null,
    summary,
    factors,
    primaryDriver: driver.id,
    primaryDriverExplanation: driver.explanation,
    mostSensitive,
    goalContext,
    scenarioResults,
    assumptions,
    limitations,
  };

  assertNoAdvisoryLanguage([
    profile.summary,
    profile.primaryDriverExplanation ?? "",
    profile.mostSensitive?.note ?? "",
    profile.goalContext?.summary ?? "",
    ...profile.assumptions,
    ...profile.limitations,
    ...profile.factors.map((factor) => factor.explanation),
  ]);

  return profile;
}
