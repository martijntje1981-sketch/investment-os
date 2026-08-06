/**
 * Portfolio Health Score v1 — public types.
 */

import type {
  HealthConfidenceLabel,
  HealthScoreBandId,
  HealthScoreBandTone,
  HealthScoreDimensionId,
} from "@/lib/services/portfolio/healthScore/config";
import type { ExpectedVolatilityLevel } from "@/lib/services/portfolio/portfolioHealthProfile";
import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

export type HealthScoreEvidence = {
  id: string;
  text: string;
  metricKey?: string;
  metricValue?: number | string | null;
};

export type HealthScoreFactor = {
  id: string;
  dimensionId: HealthScoreDimensionId | "confidence";
  title: string;
  detail: string;
  scoreImpact: "positive" | "negative" | "neutral";
};

export type HealthScoreDimensionResult = {
  id: HealthScoreDimensionId;
  label: string;
  applicable: boolean;
  /** Base weight before renormalization (0 when not applicable). */
  baseWeight: number;
  /** Effective weight after renormalization (sums to 100 across applicable). */
  effectiveWeight: number;
  rawScore: number | null;
  score: number | null;
  contribution: number;
  status: "strong" | "adequate" | "watch" | "weak" | "not_applicable";
  evidence: HealthScoreEvidence[];
  explanation: string;
};

export type HealthScoreBandResult = {
  id: HealthScoreBandId;
  label: string;
  explanation: string;
  tone: HealthScoreBandTone;
  min: number;
  max: number;
};

export type HealthScoreConfidence = {
  label: HealthConfidenceLabel;
  /** 0–100 coverage of portfolio value that is classified / valued. */
  classifiedCoveragePercent: number;
  unvaluedSharePercent: number;
  hasGoal: boolean;
  hasVolatilityEstimate: boolean;
  stalePrices: boolean;
  notes: string[];
  explanation: string;
};

export type PortfolioHealthScoreResult = {
  version: string;
  score: number;
  band: HealthScoreBandResult;
  dimensions: HealthScoreDimensionResult[];
  strengths: HealthScoreFactor[];
  attentionPoints: HealthScoreFactor[];
  improvementDrivers: string[];
  confidence: HealthScoreConfidence;
  explanation: string;
  calculatedAt: string;
  fingerprint: string;
  hasValuedPortfolio: boolean;
  portfolioIdentity: string | null;
  disclaimer: string;
};

export type PortfolioHealthScoreInput = {
  holdings: StoredPortfolioHolding[];
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  profile: PortfolioHealthProfile;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  dividends?: PortfolioDividendSnapshot | null;
  /** When prices are known stale. */
  isStale?: boolean;
  now?: Date;
};

export type DimensionScoreDraft = {
  id: HealthScoreDimensionId;
  applicable: boolean;
  rawScore: number | null;
  evidence: HealthScoreEvidence[];
  explanation: string;
};

/** Compact context for AI / deterministic insight (validated metrics only). */
export type PortfolioInsightEvidenceContext = {
  scoreVersion: string;
  fingerprint: string;
  score: number;
  bandLabel: string;
  confidenceLabel: HealthConfidenceLabel;
  classifiedCoveragePercent: number;
  portfolioIdentity: string | null;
  expectedVolatility: ExpectedVolatilityLevel | null;
  largestHoldingSymbol: string | null;
  largestHoldingWeightPercent: number | null;
  topThreeWeightPercent: number | null;
  hhi: number | null;
  cashWeightPercent: number | null;
  cryptoWeightPercent: number | null;
  goalYearsRemaining: number | null;
  goalAlignmentLabel: string | null;
  hasPassiveIncomeGoal: boolean;
  dimensionScores: Array<{
    id: HealthScoreDimensionId;
    label: string;
    score: number | null;
    applicable: boolean;
  }>;
  strengths: Array<{ title: string; detail: string }>;
  attentionPoints: Array<{ title: string; detail: string }>;
  todayChangePercent: number | null;
  topMoverSymbol: string | null;
  weakestMoverSymbol: string | null;
  dataLimitations: string[];
};
