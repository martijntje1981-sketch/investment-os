/**
 * Portfolio Stance — current economic positioning of the actual portfolio.
 * Not a risk-tolerance questionnaire and not investment advice.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export const STANCE_FACTOR_IDS = [
  "asset_posture",
  "concentration",
  "modeled_sensitivity",
  "diversification",
] as const;

export type StanceFactorId = (typeof STANCE_FACTOR_IDS)[number];

export type StanceBandId =
  | "defensive"
  | "moderately_defensive"
  | "neutral"
  | "moderately_offensive"
  | "offensive";

export type StanceConfidence = "high" | "medium" | "limited";

export type StanceDriverPolarity = "offensive" | "defensive";

export type StanceFactor = {
  id: StanceFactorId;
  label: string;
  score: number | null;
  weight: number;
  applicable: boolean;
  contributionPoints: number;
  vsNeutralPoints: number;
  explanation: string;
};

export type StanceDriver = {
  id: string;
  polarity: StanceDriverPolarity;
  label: string;
  valueLabel: string;
  effect: "pulls stance more offensive" | "moderates stance";
};

export type StanceInputs = {
  groupWeights: Partial<Record<ExposureGroupId, number>>;
  unclassifiedWeightPercent: number;
  largestHoldingWeightPercent: number | null;
  largestHoldingLabel: string | null;
  largestHoldingIsStabilizing: boolean;
  modeledImpactPercent: number | null;
  modeledScenarioId: ScenarioId | null;
  modeledScenarioName: string | null;
  distinctClassifiedGroupCount: number;
  portfolioValueAvailable: boolean;
  sourceQuality: "current" | "stored_snapshot";
};

export type PortfolioStance = {
  status: "ready" | "unavailable";
  score: number | null;
  bandId: StanceBandId | null;
  bandLabel: string | null;
  confidence: StanceConfidence | null;
  factors: StanceFactor[];
  drivers: StanceDriver[];
  conclusion: string;
  disclaimer: string;
  inputs: StanceInputs | null;
};

export type StanceHistoryCheckpoint = {
  date: string;
  score: number;
  bandId: StanceBandId;
  bandLabel: string;
  sourceQuality: "stored_snapshot" | "current";
  confidence: StanceConfidence;
};

export type StanceFactorDelta = {
  id: StanceFactorId;
  label: string;
  deltaPoints: number;
};

export type StanceChange = {
  material: boolean;
  fromScore: number;
  toScore: number;
  pointChange: number;
  fromBandId: StanceBandId;
  toBandId: StanceBandId;
  fromBandLabel: string;
  toBandLabel: string;
  zoneChanged: boolean;
  attribution: StanceFactorDelta[] | null;
  summary: string;
};

export type PortfolioStanceHistory = {
  status: "ready" | "building";
  buildingCopy: string | null;
  current: PortfolioStance;
  checkpoints: StanceHistoryCheckpoint[];
  prior: StanceHistoryCheckpoint | null;
  change: StanceChange | null;
  intelligenceDepth: FourQuestionsIntelligenceDepth;
};

export type StanceDiscoveredCandidate = {
  id: "stance-zone-shift";
  headline: string;
  evidence: string[];
  material: boolean;
};

export type GoalTradeOffContributionOption = {
  monthly: number;
  projectedCompletionLabel: string | null;
  isCurrent: boolean;
};

export type GoalTradeOffStancePath = {
  id: "current" | "more_defensive" | "more_offensive";
  label: string;
  stanceLabel: string;
  modeledDownsidePercent: number | null;
  projectedCompletionLabel: string | null;
  completionAvailable: boolean;
};

export type GoalTradeOffs = {
  available: boolean;
  reason: string | null;
  trajectory: "Ahead" | "On track" | "Behind" | "Unknown" | null;
  pathCopy: string;
  contribution: {
    currentMonthly: number | null;
    options: GoalTradeOffContributionOption[];
  };
  stance: {
    returnAssumptionsAvailable: false;
    returnAssumptionsBlockedReason: string;
    currentScore: number | null;
    currentLabel: string | null;
    paths: GoalTradeOffStancePath[];
  };
  disclaimer: string;
};
