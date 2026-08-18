/**
 * Phase 8A — compact stored intelligence state + change signals.
 * Only compare two genuinely stored snapshots. Never fabricate a previous state.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type {
  ResilienceBandId,
  ResilienceFactorId,
} from "@/lib/services/resilience/types";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export type IntelligenceSnapshotKind = "weekly" | "monthly";

export type IntelligenceStateSchemaVersion = 1;

export type IntelligencePeriodIdentity = {
  snapshotKind: IntelligenceSnapshotKind;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
};

export type IntelligenceCoverage = {
  holdingCount: number;
  valuedHoldingCount: number;
  unvaluedHoldingCount: number;
  portfolioValueAvailable: boolean;
};

export type IntelligenceHoldingState = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  value: number;
  weightPercent: number;
  assetType: "investment" | "cash" | "crypto";
  providerSymbol: string | null;
};

export type IntelligenceExposureGroupState = {
  groupId: ExposureGroupId;
  displayLabel: string;
  weightPercent: number;
};

export type IntelligenceExposureSubgroupState = {
  parentGroupId: ExposureGroupId;
  subgroupId: string;
  displayLabel: string;
  weightPercent: number;
};

export type IntelligenceConcentrationState = {
  largestHoldingId: string | null;
  largestHoldingSymbol: string | null;
  largestHoldingName: string | null;
  largestHoldingWeightPercent: number | null;
  hhi: number | null;
  concentrationLevel: string | null;
};

export type IntelligenceGoalState = {
  goalId: string | null;
  targetValue: number;
  targetYear: number;
  progressPercent: number | null;
  monthlyContribution: number | null;
  expectedAnnualReturnPercent: number | null;
  portfolioValueAvailable: boolean;
};

export type IntelligenceResilienceFactorState = {
  id: ResilienceFactorId;
  score: number | null;
};

export type IntelligenceScenarioSensitivityState = {
  scenarioId: ScenarioId;
  scenarioName: string;
  estimatedPortfolioImpactPercent: number;
};

export type IntelligenceResilienceState = {
  status: "ok" | "insufficient_data";
  score: number | null;
  bandId: ResilienceBandId | null;
  bandLabel: string | null;
  primaryDriver: ResilienceFactorId | null;
  factors: IntelligenceResilienceFactorState[];
  mostSensitive: IntelligenceScenarioSensitivityState | null;
};

export type IntelligenceScorecardState = {
  health: number | null;
  goal: number | null;
  momentum: number | null;
  readiness: number | null;
};

export type IntelligenceStatePayload = {
  schemaVersion: IntelligenceStateSchemaVersion;
  isDemo: boolean;
  portfolio: {
    totalValue: number | null;
    coverage: IntelligenceCoverage;
  };
  holdings: IntelligenceHoldingState[];
    exposure: {
      groups: IntelligenceExposureGroupState[];
      subgroups?: IntelligenceExposureSubgroupState[];
      classifiedHoldingCount: number;
    unclassifiedHoldingCount: number;
    coverageLabel: string | null;
  };
  concentration: IntelligenceConcentrationState;
  goal: IntelligenceGoalState | null;
  resilience: IntelligenceResilienceState | null;
  scorecard: IntelligenceScorecardState | null;
};

export type IntelligenceStateSnapshot = IntelligencePeriodIdentity & {
  id: string | null;
  userId: string | null;
  portfolioId: string | null;
  schemaVersion: IntelligenceStateSchemaVersion;
  capturedAt: string;
  payload: IntelligenceStatePayload;
};

export type ChangeCategory =
  | "concentration"
  | "exposure"
  | "goal_progress"
  | "resilience"
  | "scenario_sensitivity"
  | "holding_weight";

export type ChangeSignalUnit = "percentage_points" | "score_points";

export type ChangeSignalDirection =
  | "increased"
  | "decreased"
  | "unchanged"
  | "n_a";

export type ChangeSignalMateriality =
  | "material"
  | "definition_changed"
  | "insufficient";

export type ChangeSignalConfidence = "high" | "moderate" | "limited";

export type ChangeSignalWindow = {
  snapshotKind: IntelligenceSnapshotKind;
  previousPeriodKey: string;
  currentPeriodKey: string;
  previousCapturedAt: string;
  currentCapturedAt: string;
};

export type ChangeSignal = {
  id: string;
  category: ChangeCategory;
  metric: string;
  subject: string;
  previousValue: number | null;
  currentValue: number | null;
  delta: number | null;
  unit: ChangeSignalUnit;
  window: ChangeSignalWindow;
  direction: ChangeSignalDirection;
  materiality: ChangeSignalMateriality;
  headline: string;
  explanation: string;
  confidence: ChangeSignalConfidence;
  quantityChanged: boolean;
  previousQuantity: number | null;
  currentQuantity: number | null;
  limitations: string[];
};

export type ChangeIntelligenceStatus = "ready" | "insufficient_history";

export type ChangeIntelligenceResult = {
  status: ChangeIntelligenceStatus;
  reason: string | null;
  signals: ChangeSignal[];
  window: ChangeSignalWindow | null;
};

export type ChangeIntelligenceStoryRole =
  | "primary"
  | "supporting"
  | "goal"
  | "resilience";

export type ChangeIntelligenceStory = {
  id: string;
  role: ChangeIntelligenceStoryRole;
  category: ChangeCategory;
  /** Complete glance — exact previous/current values when available. */
  headline: string;
  /** Free glance — concise, no metric chain. */
  freeHeadline: string;
  supportingLine: string | null;
  relatedLines: string[];
  meaning: string;
  evidence: string[];
  whyAvailable: string;
  limitations: string[];
  quantityChanged: boolean;
  goalDefinitionChanged: boolean;
  capturedAfterPeriodEnd: boolean;
  signal: ChangeSignal;
  relatedSignals: ChangeSignal[];
};

export type ChangeIntelligenceConfidence = {
  level: ChangeSignalConfidence;
  notes: string[];
};

export type ChangeIntelligenceSummary = {
  status: ChangeIntelligenceStatus;
  reason: string | null;
  primaryStory: ChangeIntelligenceStory | null;
  supportingStories: ChangeIntelligenceStory[];
  goalChange: ChangeIntelligenceStory | null;
  resilienceChange: ChangeIntelligenceStory | null;
  confidence: ChangeIntelligenceConfidence;
  comparisonWindow: ChangeSignalWindow | null;
  freeHeadline: string | null;
  completeTease: string | null;
  noMaterialChange: boolean;
};
