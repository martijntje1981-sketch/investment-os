/**
 * Phase 13 — portfolio change attention.
 * Wraps existing Change Intelligence + daily contribution + holding news.
 * Never invents a previous state. Not investment advice.
 */

import type { ChangeSignalConfidence } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";

export type PortfolioChangeType =
  | "holding_weight_changed"
  | "largest_holding_changed"
  | "concentration_changed"
  | "exposure_mix_changed"
  | "resilience_changed"
  | "goal_progress_changed"
  | "scenario_sensitivity_changed"
  | "holding_contribution"
  | "holding_move_with_context"
  | "portfolio_relevant_news";

export type PortfolioChangeSeverity = "high" | "watch" | "info";

export type PortfolioChangeWindowKind =
  | "live_vs_snapshot"
  | "today"
  | "unavailable";

export type PortfolioChangeAttentionStatus =
  | "attention"
  | "nothing_material"
  | "insufficient_history"
  | "unavailable";

export type PortfolioChangeEvidence = {
  whyAmISeeingThis: string;
  whatChanged: string;
  whyItMattersToPortfolio: string;
  howCalculated: string;
  confidenceNote: string;
};

export type PortfolioChangeSignal = {
  id: string;
  type: PortfolioChangeType;
  severity: PortfolioChangeSeverity;
  title: string;
  summary: string;
  whyItMatters: string;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  unit: "percentage_points" | "score_points" | "percent";
  holdingSymbol: string | null;
  holdingName: string | null;
  portfolioImpactPp: number | null;
  confidence: ChangeSignalConfidence;
  detectedAt: string;
  destination: { href: string; label: string };
  evidence: PortfolioChangeEvidence;
  limitations: string[];
  fourQuestionId: FourQuestionId;
  windowKind: PortfolioChangeWindowKind;
  /** Absolute ranking score — higher is more personally material. */
  materialityScore: number;
};

export type PortfolioChangeWindow = {
  kind: PortfolioChangeWindowKind;
  label: string;
  previousCapturedAt: string | null;
  detectedAt: string;
  snapshotKind: "weekly" | "monthly" | null;
};

export type PortfolioChangeAttention = {
  status: PortfolioChangeAttentionStatus;
  headline: string;
  support: string | null;
  window: PortfolioChangeWindow;
  primary: PortfolioChangeSignal | null;
  secondary: PortfolioChangeSignal[];
  /** All ranked material signals before the 1+2 cap. */
  ranked: PortfolioChangeSignal[];
  structuralHistoryAvailable: boolean;
  dailyDataAvailable: boolean;
  limitations: string[];
};

export type SmartAlertsAccessMode = "free_preview" | "complete" | "demo";

export type AlertDeliveryChannel = "in_app" | "email" | "push";

export type AlertChannelReadiness = {
  channel: AlertDeliveryChannel;
  ready: boolean;
  reason: string;
};

/** Detection is separate from delivery. Email/push stay unready in Phase 13. */
export type AlertCandidate = {
  signalId: string;
  detectedAt: string;
  channels: AlertChannelReadiness[];
};
