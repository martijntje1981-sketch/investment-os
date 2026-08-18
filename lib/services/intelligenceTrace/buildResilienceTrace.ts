/**
 * Phase 7A — Resilience / Sleep Well evidence chain.
 * Reuses buildResilienceProfile outputs only — no independent recalculation.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { RESILIENCE_FACTOR_WEIGHTS } from "@/lib/services/resilience/config";
import type { ResilienceFactor, ResilienceProfile } from "@/lib/services/resilience/types";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

export function resilienceGlanceContextLine(
  profile: ResilienceProfile,
): string | null {
  if (profile.status !== "ok" || profile.score === null) return null;

  const scenarioFactor = profile.factors.find(
    (factor) => factor.id === "scenario_sensitivity",
  );
  const concentration = profile.factors.find(
    (factor) => factor.id === "concentration",
  );

  if (
    profile.mostSensitive &&
    Math.abs(profile.mostSensitive.estimatedPortfolioImpactPercent) >= 8
  ) {
    return "Your portfolio is more sensitive than it first appears under modeled shocks.";
  }

  if (
    concentration?.applicable &&
    concentration.score != null &&
    concentration.score < 55
  ) {
    return "Your portfolio is more concentrated than a balanced structure.";
  }

  if (
    scenarioFactor?.applicable &&
    scenarioFactor.score != null &&
    scenarioFactor.score < 55
  ) {
    return "Modeled scenario sensitivity is a main factor in today's resilience score.";
  }

  return null;
}

function formatFactorWeight(id: ResilienceFactor["id"]): string {
  const weight = RESILIENCE_FACTOR_WEIGHTS[id];
  return `${Math.round(weight * 100)}%`;
}

function buildEvidenceLayer(profile: ResilienceProfile): IntelligenceTraceLayer | null {
  const applicable = profile.factors.filter(
    (factor) => factor.applicable && factor.score !== null,
  );
  if (applicable.length === 0) return null;

  const bullets = applicable.map((factor) => {
    const scoreText =
      factor.score != null ? `${factor.score}/100` : "unavailable";
    const summary = factor.explanation.split(".")[0]?.trim();
    return `${factor.label} (${scoreText})${summary ? `: ${summary}.` : "."}`;
  });

  return {
    id: "evidence",
    title: "Evidence",
    detail: `Resilience score ${profile.score}/100${profile.bandLabel ? ` · ${profile.bandLabel}` : ""} is built from ${applicable.length} structural factor${applicable.length === 1 ? "" : "s"}.`,
    bullets,
    presentation: "expand",
  };
}

function buildMeaningLayer(profile: ResilienceProfile): IntelligenceTraceLayer | null {
  if (profile.primaryDriverExplanation) {
    return {
      id: "meaning",
      title: "What it means",
      detail: profile.primaryDriverExplanation,
      presentation: "expand",
    };
  }
  return null;
}

function buildSensitivityLayer(profile: ResilienceProfile): IntelligenceTraceLayer | null {
  const most = profile.mostSensitive;
  if (!most) return null;

  const affected =
    most.affectedPortfolioWeightPercent != null
      ? ` · about ${most.affectedPortfolioWeightPercent.toFixed(0)}% of portfolio weight affected`
      : "";

  return {
    id: "sensitivity",
    title: "What if",
    detail: `${most.scenarioName} → estimated direct portfolio impact approximately ${most.estimatedPortfolioImpactPercent.toFixed(1)}%${affected}.`,
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.scenarioStress,
  };
}

function buildGoalImpactLayer(profile: ResilienceProfile): IntelligenceTraceLayer | null {
  if (!profile.goalContext) return null;
  return {
    id: "goal_impact",
    title: "Goal impact",
    detail: profile.goalContext.summary,
    presentation: "explore",
    href: "/goals",
  };
}

function buildCalculationLayer(profile: ResilienceProfile): IntelligenceTraceLayer {
  const bullets = profile.factors
    .filter((factor) => factor.applicable && factor.score !== null)
    .map(
      (factor) =>
        `${factor.label}: ${factor.score}/100 × ${formatFactorWeight(factor.id)} weight`,
    );

  return {
    id: "calculation",
    title: "How Tobailey calculated this",
    detail:
      "Master resilience score is a weighted blend of concentration, diversification, cash buffer, and supported scenario sensitivity.",
    bullets: bullets.length > 0 ? bullets : undefined,
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.resilienceSleep,
  };
}

function buildConfidenceLayer(profile: ResilienceProfile): IntelligenceTraceLayer {
  const bullets = [
    ...profile.limitations.slice(0, 2),
    "Historical resilience-factor comparison unavailable.",
  ];
  if (profile.status === "insufficient_data") {
    bullets.unshift("Some resilience factors could not be scored from current holdings.");
  }

  return {
    id: "confidence",
    title: "Data confidence",
    detail: bullets[0] ?? "Based on currently valued holdings and supported scenarios.",
    bullets: bullets.length > 1 ? bullets.slice(1) : undefined,
    presentation: "explore",
  };
}

export function buildResilienceTrace(input: {
  profile: ResilienceProfile;
  insight: string;
}): IntelligenceTrace | null {
  const { profile, insight } = input;
  if (profile.status !== "ok" || profile.score === null) return null;

  const layers: IntelligenceTraceLayer[] = [];
  const omittedLayerIds: IntelligenceTraceLayer["id"][] = ["change"];

  const evidence = buildEvidenceLayer(profile);
  if (evidence) layers.push(evidence);

  const meaning = buildMeaningLayer(profile);
  if (meaning) layers.push(meaning);

  const sensitivity = buildSensitivityLayer(profile);
  if (sensitivity) layers.push(sensitivity);

  const goalImpact = buildGoalImpactLayer(profile);
  if (goalImpact) layers.push(goalImpact);

  layers.push(buildCalculationLayer(profile));
  layers.push(buildConfidenceLayer(profile));

  if (layers.length === 0) return null;

  return {
    insight,
    layers,
    omittedLayerIds,
  };
}
