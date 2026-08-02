/**
 * Readiness Score — setup completeness for useful analysis (not investment quality).
 */

import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { PortfolioHealthScoreResult } from "@/lib/services/portfolio/healthScore";
import {
  PORTFOLIO_SCORECARD_VERSION,
  READINESS_BANDS,
} from "@/lib/services/portfolio/scorecard/config";
import {
  availableScore,
  clampScore,
  confidenceFromLevel,
  interpolateAnchors,
  unavailableScore,
} from "@/lib/services/portfolio/scorecard/math";
import type { PortfolioScore } from "@/lib/services/portfolio/scorecard/types";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export const READINESS_SECTION_ID = "portfolio-readiness";

export type BuildReadinessScoreInput = {
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  health: PortfolioHealthScoreResult;
  hasSavedGoal: boolean;
  hasPerformanceHistory?: boolean;
  calculatedAt?: string;
};

export function buildReadinessScore(
  input: BuildReadinessScoreInput,
): PortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const { analysis, exposure, health, hasSavedGoal } = input;

  if (analysis.totalValue <= 0 && analysis.valuedPositions.length === 0) {
    return unavailableScore({
      id: "readiness",
      version: `${PORTFOLIO_SCORECARD_VERSION}-readiness`,
      label: "Readiness",
      shortLabel: "Readiness",
      reason: "Add holdings",
      calculatedAt,
      href: DASHBOARD_DEEP_LINKS.scorecardReadiness,
    });
  }

  const classified = health.confidence.classifiedCoveragePercent;
  const unvaluedShare = health.confidence.unvaluedSharePercent;
  const pricedShare = Math.max(0, 100 - unvaluedShare);
  const stale = health.confidence.stalePrices;

  const priceScore = interpolateAnchors(pricedShare, [
    { at: 50, score: 30 },
    { at: 75, score: 55 },
    { at: 90, score: 78 },
    { at: 98, score: 92 },
    { at: 100, score: 96 },
  ]);

  const classificationScore = interpolateAnchors(classified, [
    { at: 40, score: 28 },
    { at: 70, score: 55 },
    { at: 85, score: 75 },
    { at: 95, score: 90 },
    { at: 100, score: 96 },
  ]);

  // Goal unlocks tracking — bonus, not a hard requirement for high readiness
  const goalScore = hasSavedGoal ? 88 : 62;

  const historyScore = input.hasPerformanceHistory ? 86 : 58;

  let stalePenalty = 0;
  if (stale) stalePenalty = 10;

  const raw = clampScore(
    priceScore * 0.35 +
      classificationScore * 0.35 +
      goalScore * 0.15 +
      historyScore * 0.15 -
      stalePenalty,
  );

  const evidence = [
    {
      id: "priced-coverage",
      label: "Priced coverage",
      value: Number(pricedShare.toFixed(0)),
      explanation: `${pricedShare.toFixed(0)}% of holdings by count have usable market values.`,
    },
    {
      id: "classified-coverage",
      label: "Classified value",
      value: classified,
      explanation: `${classified.toFixed(0)}% of portfolio value is classified into known exposure groups.`,
    },
    {
      id: "goal-configured",
      label: "Goal",
      explanation: hasSavedGoal
        ? "A savings goal is configured."
        : "Adding a goal would unlock goal tracking.",
    },
  ];

  if (stale) {
    evidence.push({
      id: "stale-prices",
      label: "Price freshness",
      explanation: "Some portfolio prices are marked stale.",
    });
  }
  if (exposure.unclassifiedHoldingCount > 0) {
    evidence.push({
      id: "unclassified-holdings",
      label: "Classification gaps",
      value: exposure.unclassifiedHoldingCount,
      explanation: `${exposure.unclassifiedHoldingCount} holding${exposure.unclassifiedHoldingCount === 1 ? "" : "s"} still lack a verified classification.`,
    });
  }
  if (!input.hasPerformanceHistory) {
    evidence.push({
      id: "history-gap",
      label: "Performance history",
      explanation:
        "Historical data is incomplete for multi-week momentum windows.",
    });
  }

  const attention: string[] = [];
  const strengths: string[] = [];
  if (classified >= 90 && pricedShare >= 90) {
    strengths.push("Portfolio data is sufficiently complete for analysis");
  }
  if (!hasSavedGoal) attention.push("Adding a goal would unlock goal tracking");
  if (classified < 85) {
    attention.push("One or more holdings still lack verified classification");
  }
  if (stale) attention.push("Refresh stale prices when available");

  return availableScore({
    id: "readiness",
    version: `${PORTFOLIO_SCORECARD_VERSION}-readiness`,
    value: raw,
    label: "Readiness",
    shortLabel: "Readiness",
    bands: READINESS_BANDS,
    confidence: confidenceFromLevel(
      stale || classified < 70 ? "moderate" : "high",
    ),
    summary:
      READINESS_BANDS.find((b) => raw >= b.min && raw <= b.max)?.label ??
      "Setup coverage",
    evidence,
    strengths,
    attentionPoints: attention,
    calculatedAt,
    href: DASHBOARD_DEEP_LINKS.scorecardReadiness,
  });
}
