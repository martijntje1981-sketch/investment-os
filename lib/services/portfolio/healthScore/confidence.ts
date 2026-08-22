/**
 * Separate confidence model — does not dominate the health score.
 */

import {
  CONFIDENCE_THRESHOLDS,
  type HealthConfidenceLabel,
} from "@/lib/services/portfolio/healthScore/config";
import type {
  HealthScoreConfidence,
  PortfolioHealthScoreInput,
} from "@/lib/services/portfolio/healthScore/types";

export function buildHealthScoreConfidence(
  input: PortfolioHealthScoreInput,
): HealthScoreConfidence {
  const { analysis, exposure, profile, hasSavedGoal, isStale } = input;
  const notes: string[] = [];

  const unclassified =
    exposure.groups.find((group) => group.groupId === "other_unclassified")
      ?.displayPercent ?? 0;
  const classifiedCoveragePercent = Math.max(
    0,
    Math.min(100, 100 - unclassified),
  );

  const unvaluedSharePercent =
    analysis.valuedPositions.length + analysis.unvaluedHoldings.length > 0
      ? (analysis.unvaluedHoldings.length /
          Math.max(
            analysis.valuedPositions.length + analysis.unvaluedHoldings.length,
            1,
          )) *
        100
      : analysis.unvaluedHoldings.length > 0
        ? 100
        : 0;

  if (classifiedCoveragePercent < CONFIDENCE_THRESHOLDS.moderateMinCoverage) {
    notes.push(
      `Only ${classifiedCoveragePercent.toFixed(0)}% of portfolio value is classified into known exposure groups.`,
    );
  }
  if (analysis.unvaluedHoldings.length > 0) {
    notes.push(
      `${analysis.unvaluedHoldings.length} holding${analysis.unvaluedHoldings.length === 1 ? "" : "s"} lack a reliable market value.`,
    );
  }
  if (isStale) {
    notes.push("Some portfolio prices are marked stale.");
  }
  if (!hasSavedGoal) {
    notes.push(
      "No savings goal is configured — goal-fit confidence is limited.",
    );
  }
  if (profile.partialData) {
    notes.push(...profile.dataNotes.slice(0, 2));
  }

  let label: HealthConfidenceLabel = "High confidence";
  if (
    classifiedCoveragePercent < CONFIDENCE_THRESHOLDS.moderateMinCoverage ||
    unvaluedSharePercent > CONFIDENCE_THRESHOLDS.moderateMaxUnvaluedShare ||
    (isStale && classifiedCoveragePercent < 85)
  ) {
    label = "Limited confidence";
  } else if (
    classifiedCoveragePercent < CONFIDENCE_THRESHOLDS.highMinCoverage ||
    unvaluedSharePercent > CONFIDENCE_THRESHOLDS.highMaxUnvaluedShare ||
    isStale ||
    !hasSavedGoal
  ) {
    label = "Moderate confidence";
  }

  return {
    label,
    classifiedCoveragePercent: Number(classifiedCoveragePercent.toFixed(1)),
    unvaluedSharePercent: Number(unvaluedSharePercent.toFixed(1)),
    hasGoal: hasSavedGoal,
    hasVolatilityEstimate: profile.hasValuedPortfolio,
    stalePrices: Boolean(isStale),
    notes,
    explanation: `${classifiedCoveragePercent.toFixed(0)}% of portfolio value is classified${isStale ? "; prices may be stale" : ""}.`,
  };
}
