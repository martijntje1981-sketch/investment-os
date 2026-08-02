/**
 * Portfolio Scorecard — shared types and weekly-email snapshot contract.
 *
 * Score history: previousValue/delta stay null until weekly snapshots are
 * persisted (recommended next step: store one PortfolioScorecardSnapshot per
 * user per week). Do not backfill deltas from current holdings.
 */

import type {
  PortfolioScoreId,
  ScoreBandTone,
  ScoreConfidenceLevel,
} from "@/lib/services/portfolio/scorecard/config";

export type PortfolioScoreEvidence = {
  id: string;
  label: string;
  value?: string | number | null;
  explanation: string;
};

export type PortfolioScoreBand = {
  id: string;
  label: string;
  tone: ScoreBandTone;
};

export type PortfolioScoreConfidence = {
  level: ScoreConfidenceLevel;
  label: string;
};

export type PortfolioScore = {
  id: PortfolioScoreId;
  version: string;
  value: number | null;
  label: string;
  shortLabel: string;
  band: PortfolioScoreBand | null;
  confidence: PortfolioScoreConfidence;
  summary: string;
  evidence: PortfolioScoreEvidence[];
  strengths: string[];
  attentionPoints: string[];
  calculatedAt: string;
  available: boolean;
  unavailableReason?: string;
  href: string;
};

export type PortfolioScorecardResult = {
  scorecardVersion: string;
  calculatedAt: string;
  portfolioFingerprint: string;
  scores: {
    health: PortfolioScore;
    goal: PortfolioScore;
    momentum: PortfolioScore;
    readiness: PortfolioScore;
  };
  summary: {
    headline: string;
    lines: string[];
  };
};

/** Serializable contract for future weekly email (no fake deltas). */
export type ScoreSnapshot = {
  id: PortfolioScoreId;
  value: number | null;
  available: boolean;
  label: string;
  bandLabel: string | null;
  tone: ScoreBandTone | null;
  confidenceLabel: string;
  summary: string;
  evidenceIds: string[];
  previousValue: number | null;
  delta: number | null;
  unavailableReason?: string;
};

export type PortfolioScorecardSnapshot = {
  userId?: string;
  scorecardVersion: string;
  calculatedAt: string;
  portfolioFingerprint: string;
  scores: {
    health: ScoreSnapshot;
    goal: ScoreSnapshot;
    momentum: ScoreSnapshot;
    readiness: ScoreSnapshot;
  };
  summary: {
    headline: string;
    lines: string[];
  };
};
