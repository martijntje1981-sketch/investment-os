/**
 * Factor scorers for Resilience / Sleep Well.
 * Reuses existing analysis, classification, and Health concentration scoring.
 */

import {
  buildPortfolioAnalysis,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import {
  buildPortfolioExposureAllocation,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";
import {
  DIVERSIFICATION_COUNTABLE_GROUPS,
  DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
} from "@/lib/services/portfolio/healthScore/config";
import { scoreConcentrationDimension } from "@/lib/services/portfolio/healthScore/dimensions";
import {
  clampScore,
  interpolateAnchors,
  roundScore,
} from "@/lib/services/portfolio/healthScore/math";
import { buildSharedClassification } from "@/lib/services/portfolio/portfolioHealthProfile";
import {
  CASH_BUFFER_ANCHORS,
  DIVERSIFICATION_GROUP_ANCHORS,
  SCENARIO_SENSITIVITY_ANCHORS,
} from "@/lib/services/resilience/config";
import type { ResilienceFactor } from "@/lib/services/resilience/types";
import type { ScenarioResult } from "@/lib/services/scenarioEngine";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ResilienceInputs = {
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  cashWeight: number;
  cryptoWeight: number;
  equityWeight: number;
  largestGroupLabel: string | null;
  largestGroupWeightPercent: number;
  distinctGroupCount: number;
};

export function collectResilienceInputs(
  holdings: StoredPortfolioHolding[],
): ResilienceInputs {
  const analysis = buildPortfolioAnalysis(holdings);
  const exposure = buildPortfolioExposureAllocation(holdings);
  const classification = buildSharedClassification(exposure);

  const countable = new Set<string>(DIVERSIFICATION_COUNTABLE_GROUPS);
  const countableGroups = exposure.groups.filter(
    (group) =>
      countable.has(group.groupId) &&
      group.displayPercent >= DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
  );

  const largestGroup = [...exposure.groups].sort(
    (left, right) => right.rawPercent - left.rawPercent,
  )[0];

  return {
    analysis,
    exposure,
    cashWeight: classification.cashWeight,
    cryptoWeight: classification.cryptoWeight,
    equityWeight: classification.equityWeight,
    largestGroupLabel: largestGroup?.displayLabel ?? null,
    largestGroupWeightPercent: largestGroup?.rawPercent ?? 0,
    distinctGroupCount: countableGroups.length,
  };
}

export function scoreConcentrationFactor(
  analysis: PortfolioAnalysisSnapshot,
): ResilienceFactor {
  const draft = scoreConcentrationDimension(analysis);
  const largest = analysis.largestPosition;

  if (!draft.applicable || draft.rawScore === null) {
    return {
      id: "concentration",
      label: "Concentration",
      score: null,
      applicable: false,
      explanation:
        "Concentration cannot be assessed without valued holdings.",
    };
  }

  const largestText = largest
    ? `Your largest holding (${largest.holding.symbol}) represents ${largest.weightPercent.toFixed(1)}% of the portfolio, so a large part of portfolio outcomes depends on one exposure.`
    : "Concentration is assessed from current valued holding weights.";

  return {
    id: "concentration",
    label: "Concentration",
    score: roundScore(draft.rawScore),
    applicable: true,
    explanation: largestText,
  };
}

export function scoreDiversificationFactor(input: ResilienceInputs): ResilienceFactor {
  if (!(input.analysis.totalValue > 0)) {
    return {
      id: "diversification",
      label: "Diversification",
      score: null,
      applicable: false,
      explanation:
        "Diversification cannot be assessed without valued holdings.",
    };
  }

  let score = interpolateAnchors(
    input.distinctGroupCount,
    DIVERSIFICATION_GROUP_ANCHORS,
  );

  const diversifiedEquity = input.exposure.groups.find(
    (group) => group.groupId === "diversified_equity",
  );
  const broadWeight = diversifiedEquity?.displayPercent ?? 0;
  if (broadWeight >= 25) {
    score = clampScore(score + 8);
  }

  const dominantNote =
    input.largestGroupLabel && input.largestGroupWeightPercent >= 45
      ? ` Your portfolio spans ${input.distinctGroupCount} classified exposure group${input.distinctGroupCount === 1 ? "" : "s"}, but ${input.largestGroupLabel} remains dominant at ${input.largestGroupWeightPercent.toFixed(0)}%.`
      : ` Your portfolio spans ${input.distinctGroupCount} classified exposure group${input.distinctGroupCount === 1 ? "" : "s"} at meaningful weight.`;

  return {
    id: "diversification",
    label: "Diversification",
    score: roundScore(score),
    applicable: true,
    explanation: dominantNote.trim(),
  };
}

export function scoreCashBufferFactor(cashWeight: number, hasValue: boolean): ResilienceFactor {
  if (!hasValue) {
    return {
      id: "cash_buffer",
      label: "Cash buffer",
      score: null,
      applicable: false,
      explanation: "Cash buffer cannot be assessed without portfolio value.",
    };
  }

  const score = roundScore(interpolateAnchors(cashWeight, CASH_BUFFER_ANCHORS));
  const explanation =
    cashWeight <= 0
      ? "No cash is currently recorded, so modeled equity and crypto shocks apply to the full valued portfolio."
      : `${cashWeight.toFixed(0)}% of the portfolio is held in cash, which is not directly affected by the modeled equity and crypto shocks.`;

  return {
    id: "cash_buffer",
    label: "Cash buffer",
    score,
    applicable: true,
    explanation,
  };
}

export function scoreScenarioSensitivityFactor(
  scenarioResults: ScenarioResult[],
): ResilienceFactor {
  const usable = scenarioResults.filter(
    (result) =>
      result.status === "ok" &&
      result.estimatedPortfolioImpactPercent !== null &&
      Number.isFinite(result.estimatedPortfolioImpactPercent),
  );

  if (usable.length === 0) {
    return {
      id: "scenario_sensitivity",
      label: "Scenario sensitivity",
      score: null,
      applicable: false,
      explanation:
        "Scenario sensitivity is unavailable because no supported scenario produced a reliable impact estimate.",
    };
  }

  const worst = usable.reduce((best, row) =>
    (row.estimatedPortfolioImpactPercent ?? 0) <
    (best.estimatedPortfolioImpactPercent ?? 0)
      ? row
      : best,
  );

  const absImpact = Math.abs(worst.estimatedPortfolioImpactPercent ?? 0);
  const score = roundScore(
    interpolateAnchors(absImpact, SCENARIO_SENSITIVITY_ANCHORS),
  );

  return {
    id: "scenario_sensitivity",
    label: "Scenario sensitivity",
    score,
    applicable: true,
    explanation: `Of the supported scenarios, ${worst.scenarioName} currently produces the largest estimated portfolio impact (${formatSignedPercent(worst.estimatedPortfolioImpactPercent ?? 0)}).`,
  };
}

export function pickMostSensitiveScenario(
  scenarioResults: ScenarioResult[],
): {
  scenarioId: ScenarioResult["scenarioId"];
  scenarioName: string;
  estimatedPortfolioImpactPercent: number;
  estimatedPortfolioImpactAmount: number | null;
  affectedPortfolioWeightPercent: number | null;
} | null {
  const usable = scenarioResults.filter(
    (result) =>
      result.status === "ok" &&
      result.estimatedPortfolioImpactPercent !== null &&
      Number.isFinite(result.estimatedPortfolioImpactPercent),
  );
  if (usable.length === 0) return null;

  const worst = usable.reduce((best, row) =>
    (row.estimatedPortfolioImpactPercent ?? 0) <
    (best.estimatedPortfolioImpactPercent ?? 0)
      ? row
      : best,
  );

  return {
    scenarioId: worst.scenarioId,
    scenarioName: worst.scenarioName,
    estimatedPortfolioImpactPercent: worst.estimatedPortfolioImpactPercent!,
    estimatedPortfolioImpactAmount: worst.estimatedPortfolioImpactAmount,
    affectedPortfolioWeightPercent: worst.affectedPortfolioWeightPercent,
  };
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
