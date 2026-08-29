/**
 * Portfolio Evolution — deterministic, evidence-backed timeline.
 * Never fabricates holdings, trades, or daily allocation history.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { PerformancePeriodId } from "@/lib/client/performance/types";

export const EVOLUTION_TIMEFRAME_IDS = ["30D", "90D", "1Y", "ALL"] as const;

export type EvolutionTimeframeId = (typeof EVOLUTION_TIMEFRAME_IDS)[number];

export type EvolutionSourceQuality =
  | "reconstructed_constant_holdings"
  | "stored_snapshot"
  | "recorded_ledger"
  | "current";

export type EvolutionValuePoint = {
  date: string;
  portfolioValue: number;
  sourceQuality: "reconstructed_constant_holdings";
};

export type EvolutionFundingEvent = {
  id: string;
  date: string;
  kind: "contribution" | "withdrawal";
  amount: number;
  title: string;
  immediateEffectLabel: string;
  /** Ledger destination only — never inferred from later prices. */
  recordedDestinationLabel: string | null;
  /**
   * Allocation change only when stored snapshots straddle the event.
   * Worded as coincidence, not causation.
   */
  allocationCoincidence: {
    groupId: ExposureGroupId;
    groupLabel: string;
    fromPercent: number;
    toPercent: number;
  } | null;
};

export type EvolutionMixCheckpoint = {
  date: string;
  label: string;
  sourceQuality: "stored_snapshot" | "current";
  groups: Array<{
    groupId: ExposureGroupId;
    displayLabel: string;
    weightPercent: number;
  }>;
};

export type EvolutionBeforeNowMetric = {
  id: string;
  label: string;
  fromLabel: string;
  toLabel: string;
  deltaLabel: string;
  absDelta: number;
  kind:
    | "crypto_exposure"
    | "largest_holding"
    | "scenario_sensitivity"
    | "cash"
    | "fixed_income"
    | "precious_metals"
    | "unclassified"
    | "value";
};

export type EvolutionStructuralMarker = {
  id: string;
  date: string;
  kind:
    | "contribution"
    | "withdrawal"
    | "crypto_crossed_50"
    | "largest_holding_crossed_50"
    | "cash_fell_below_5"
    | "fixed_income_introduced"
    | "precious_metals_introduced"
    | "scenario_sensitivity_changed";
  label: string;
};

export type EvolutionFundingVsMarket = {
  windowLabel: string;
  valueChange: number | null;
  valueChangeSource: "stored_snapshot" | "reconstructed_constant_holdings" | null;
  recordedNetFunding: number;
  contributionBasisReliable: boolean;
  /**
   * Residual only when snapshot totals bookend the window.
   * Never presented as complete attribution when the ledger may be incomplete.
   */
  investmentMovementApproximate: number | null;
  copy: string;
};

export type EvolutionConclusion = {
  primary: string;
  supporting: string[];
  material: boolean;
};

export type EvolutionNowState = {
  asOfDate: string;
  portfolioValue: number | null;
  portfolioValueAvailable: boolean;
  exposure: Array<{
    groupId: ExposureGroupId;
    displayLabel: string;
    weightPercent: number;
  }>;
  largestHoldingSymbol: string | null;
  largestHoldingName: string | null;
  largestHoldingWeightPercent: number | null;
  bitcoinDependent: boolean;
  scenarioId: string | null;
  scenarioName: string | null;
  scenarioImpactPercent: number | null;
  resilienceScore: number | null;
  goalProgressPercent: number | null;
};

export type PortfolioEvolutionTimeline = {
  timeframe: EvolutionTimeframeId;
  timeframeEnabled: Record<EvolutionTimeframeId, boolean>;
  performancePeriod: PerformancePeriodId;
  valueSeries: EvolutionValuePoint[];
  chartPoints: PortfolioPerformancePoint[];
  hasValueSeries: boolean;
  valueSourceQuality: "reconstructed_constant_holdings" | null;
  startValue: number | null;
  endValue: number | null;
  comparisonWindowLabel: string;
  fundingEvents: EvolutionFundingEvent[];
  /** Sparse stored checkpoints only — never interpolated daily mix. */
  mixCheckpoints: EvolutionMixCheckpoint[] | null;
  mixHistoryBlocked: boolean;
  mixHistoryBlockReason: string | null;
  beforeNow: EvolutionBeforeNowMetric[];
  structuralMarkers: EvolutionStructuralMarker[];
  fundingVsMarket: EvolutionFundingVsMarket | null;
  conclusion: EvolutionConclusion;
  emptyState: "ready" | "building";
  performanceToggleAvailable: false;
  intelligenceDepth: FourQuestionsIntelligenceDepth;
  methodologyNote: string;
};

export type EvolutionCompactCard = {
  windowLabel: string;
  fromValue: number | null;
  toValue: number | null;
  fromLabel: string | null;
  toLabel: string | null;
  metric: EvolutionBeforeNowMetric | null;
  conclusion: string;
  building: boolean;
  href: string;
};
