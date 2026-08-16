/**
 * Dynamic Daily / Weekly Portfolio Scores — shared types and snapshot contract.
 * Structural Scorecard (Health/Goal/Momentum/Readiness) is separate.
 */

import type { ScoreBandTone } from "@/lib/services/portfolio/scorecard/config";

export type DynamicPortfolioScoreId = "daily" | "weekly" | "monthly";

export type DynamicScoreEvidence = {
  id: string;
  label: string;
  value?: string | number | null;
  explanation: string;
};

export type DynamicScoreBand = {
  id: string;
  label: string;
  tone: ScoreBandTone;
};

/**
 * Central typed model for dynamic period scores (Dashboard + future channels).
 */
export type DynamicPortfolioScore = {
  id: DynamicPortfolioScoreId;
  version: string;
  value: number | null;
  available: boolean;
  unavailableReason?: string;
  band: DynamicScoreBand | null;
  summary: string;
  evidence: DynamicScoreEvidence[];
  calculatedAt: string;
  timingContext: string;
  href: string;
};

/**
 * Serializable snapshot for future email / push / widgets / trend.
 * previousValue and delta stay null until real history exists.
 */
export type DynamicPortfolioScoreSnapshot = {
  id: DynamicPortfolioScoreId;
  version: string;
  value: number | null;
  available: boolean;
  unavailableReason?: string;
  bandId: string | null;
  bandLabel: string | null;
  summary: string;
  evidenceIds: string[];
  calculatedAt: string;
  timingContext: string;
  previousValue: number | null;
  delta: number | null;
};

export type PortfolioPulseResult = {
  daily: DynamicPortfolioScore;
  weekly: DynamicPortfolioScore;
  monthly: DynamicPortfolioScore;
  /** One concise Dashboard summary combining period scores. */
  combinedSummary: string;
  calculatedAt: string;
};

export function toDynamicScoreSnapshot(
  score: DynamicPortfolioScore,
): DynamicPortfolioScoreSnapshot {
  return {
    id: score.id,
    version: score.version,
    value: score.value,
    available: score.available,
    unavailableReason: score.unavailableReason,
    bandId: score.band?.id ?? null,
    bandLabel: score.band?.label ?? null,
    summary: score.summary,
    evidenceIds: score.evidence.map((item) => item.id),
    calculatedAt: score.calculatedAt,
    timingContext: score.timingContext,
    previousValue: null,
    delta: null,
  };
}
