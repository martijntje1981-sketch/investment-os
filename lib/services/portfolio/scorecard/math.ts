/**
 * Shared helpers for scorecard scoring.
 */

import {
  resolveBand,
  type ScoreBandDefinition,
} from "@/lib/services/portfolio/scorecard/config";
import type {
  PortfolioScore,
  PortfolioScoreBand,
  PortfolioScoreConfidence,
  PortfolioScoreEvidence,
} from "@/lib/services/portfolio/scorecard/types";
import type { PortfolioScoreId } from "@/lib/services/portfolio/scorecard/config";
import type { ScoreConfidenceLevel } from "@/lib/services/portfolio/scorecard/config";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function roundScore(value: number): number {
  return Math.round(clampScore(value));
}

export function interpolateAnchors(
  value: number,
  anchors: ReadonlyArray<{ readonly at: number; readonly score: number }>,
): number {
  if (anchors.length === 0) return 0;
  if (!Number.isFinite(value)) return anchors[0]!.score;
  if (value <= anchors[0]!.at) return anchors[0]!.score;
  const last = anchors[anchors.length - 1]!;
  if (value >= last.at) return last.score;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const left = anchors[i]!;
    const right = anchors[i + 1]!;
    if (value >= left.at && value <= right.at) {
      const span = right.at - left.at;
      if (span <= 0) return right.score;
      const t = (value - left.at) / span;
      return left.score + t * (right.score - left.score);
    }
  }
  return last.score;
}

export function confidenceFromLevel(
  level: ScoreConfidenceLevel,
): PortfolioScoreConfidence {
  if (level === "high") return { level, label: "High confidence" };
  if (level === "moderate") return { level, label: "Moderate confidence" };
  return { level, label: "Limited confidence" };
}

export function bandFromValue(
  value: number,
  bands: ScoreBandDefinition[],
): PortfolioScoreBand {
  const band = resolveBand(value, bands);
  return { id: band.id, label: band.label, tone: band.tone };
}

export function availableScore(input: {
  id: PortfolioScoreId;
  version: string;
  value: number;
  label: string;
  shortLabel: string;
  bands: ScoreBandDefinition[];
  confidence: PortfolioScoreConfidence;
  summary: string;
  evidence: PortfolioScoreEvidence[];
  strengths: string[];
  attentionPoints: string[];
  calculatedAt: string;
  href: string;
}): PortfolioScore {
  const value = roundScore(input.value);
  return {
    id: input.id,
    version: input.version,
    value,
    label: input.label,
    shortLabel: input.shortLabel,
    band: bandFromValue(value, input.bands),
    confidence: input.confidence,
    summary: input.summary,
    evidence: input.evidence,
    strengths: input.strengths,
    attentionPoints: input.attentionPoints,
    calculatedAt: input.calculatedAt,
    available: true,
    href: input.href,
  };
}

export function unavailableScore(input: {
  id: PortfolioScoreId;
  version: string;
  label: string;
  shortLabel: string;
  reason: string;
  calculatedAt: string;
  href: string;
  confidence?: PortfolioScoreConfidence;
}): PortfolioScore {
  return {
    id: input.id,
    version: input.version,
    value: null,
    label: input.label,
    shortLabel: input.shortLabel,
    band: null,
    confidence: input.confidence ?? confidenceFromLevel("limited"),
    summary: input.reason,
    evidence: [
      {
        id: `${input.id}-unavailable`,
        label: "Availability",
        explanation: input.reason,
      },
    ],
    strengths: [],
    attentionPoints: [input.reason],
    calculatedAt: input.calculatedAt,
    available: false,
    unavailableReason: input.reason,
    href: input.href,
  };
}
