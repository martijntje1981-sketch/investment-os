/**
 * Adapt phs-v1 Health Score into the shared PortfolioScore shape.
 * Does not recalculate Health — maps existing result only.
 */

import { PORTFOLIO_HEALTH_SCORE_VERSION } from "@/lib/services/portfolio/healthScore";
import type { PortfolioHealthScoreResult } from "@/lib/services/portfolio/healthScore";
import { HEALTH_BANDS } from "@/lib/services/portfolio/scorecard/config";
import {
  availableScore,
  confidenceFromLevel,
  unavailableScore,
} from "@/lib/services/portfolio/scorecard/math";
import type { PortfolioScore } from "@/lib/services/portfolio/scorecard/types";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { ScoreConfidenceLevel } from "@/lib/services/portfolio/scorecard/config";

function mapConfidenceLabel(label: string): ScoreConfidenceLevel {
  if (label.startsWith("High")) return "high";
  if (label.startsWith("Moderate")) return "moderate";
  return "limited";
}

export function adaptHealthScore(
  health: PortfolioHealthScoreResult,
): PortfolioScore {
  const calculatedAt = health.calculatedAt;

  if (!health.hasValuedPortfolio) {
    return unavailableScore({
      id: "health",
      version: PORTFOLIO_HEALTH_SCORE_VERSION,
      label: "Health",
      shortLabel: "Health",
      reason: "Add valued holdings to unlock a Health Score.",
      calculatedAt,
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
      confidence: confidenceFromLevel(
        mapConfidenceLabel(health.confidence.label),
      ),
    });
  }

  return availableScore({
    id: "health",
    version: PORTFOLIO_HEALTH_SCORE_VERSION,
    value: health.score,
    label: "Health",
    shortLabel: "Health",
    bands: HEALTH_BANDS,
    confidence: confidenceFromLevel(
      mapConfidenceLabel(health.confidence.label),
    ),
    summary: health.band.label,
    evidence: health.dimensions
      .filter((d) => d.applicable && d.evidence[0])
      .slice(0, 4)
      .map((d) => ({
        id: d.evidence[0]!.id,
        label: d.label,
        value: d.score,
        explanation: d.evidence[0]!.text,
      })),
    strengths: health.strengths.map((s) => s.title),
    attentionPoints: health.attentionPoints.map((s) => s.title),
    calculatedAt,
    href: DASHBOARD_DEEP_LINKS.scorecardHealth,
  });
}
