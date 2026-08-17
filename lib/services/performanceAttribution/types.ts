/**
 * Phase 3A — Deep Performance Attribution types.
 * Pure data contracts. No UI. No AI.
 *
 * Levels leave room for future ETF look-through without rewriting the engine.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { PerformanceDataAvailability } from "@/lib/client/performance/types";

/** Attribution UI / capability periods (12M maps to existing 1Y history). */
export type AttributionPeriodId = "1D" | "1W" | "1M" | "3M" | "12M";

export type AttributionCapabilityStatus =
  | "supported"
  | "partial"
  | "unavailable";

export type AttributionCalculationMethod =
  | "previous_close_day_move"
  | "constant_holdings_eod"
  | "unavailable";

/**
 * Future-compatible attribution grain.
 * Phase 3A only emits instrument + classified_asset_group.
 */
export type AttributionLevel =
  | "instrument"
  | "classified_asset_group"
  | "future_underlying";

export type AttributionPeriodCapability = {
  period: AttributionPeriodId;
  status: AttributionCapabilityStatus;
  label: string;
  shortLabel: string;
  /** Honest description of what this period measures. */
  periodSemantics: string;
  calculationMethod: AttributionCalculationMethod;
  reason: string | null;
  /** Maps to PerformancePeriodId when a history fetch is needed. */
  historyPeriodId: "1D" | "1W" | "1M" | "1Y" | null;
};

export type HoldingAttributionRow = {
  level: "instrument";
  holdingId: string;
  symbol: string;
  name: string;
  assetType: "investment" | "cash" | "crypto" | null;
  /** Holding return over the period when start value > 0. */
  returnPercent: number | null;
  /** Absolute EUR market move (price × qty), not flows. */
  contributionAmount: number | null;
  /** Percentage points of portfolio return. */
  contributionPp: number | null;
  startingWeightPercent: number | null;
  endingWeightPercent: number | null;
  startingValue: number | null;
  endingValue: number | null;
  /** Share of material |pp| (0–1), null when not material. */
  contributionShare: number | null;
  included: boolean;
  exclusionReason: string | null;
  exposureGroupId: ExposureGroupId | null;
  exposureLabel: string | null;
};

export type AssetClassAttributionRow = {
  level: "classified_asset_group";
  groupId: ExposureGroupId;
  label: string;
  contributionPp: number | null;
  contributionAmount: number | null;
  returnPercent: number | null;
  startingWeightPercent: number | null;
  endingWeightPercent: number | null;
  contributionShare: number | null;
  holdingCount: number;
};

export type AttributionConclusionKind =
  | "dominant_contributor"
  | "dominant_detractor"
  | "broad_positive"
  | "broad_negative"
  | "concentrated"
  | "largest_not_top"
  | "incomplete_coverage"
  | "quiet"
  | "cash_flow_limitation";

export type AttributionConclusion = {
  id: string;
  kind: AttributionConclusionKind;
  text: string;
};

export type AttributionDataQuality = {
  coveragePercent: number | null;
  includedHoldingCount: number;
  excludedHoldingCount: number;
  cashHoldingCount: number;
  classificationCoveragePercent: number | null;
  flowsAdjusted: false;
  quantitiesHeldConstant: boolean;
  historicalFxApproximate: boolean;
  missingHistorySymbols: string[];
  /** Human-readable warnings for meaningful UI only. */
  warnings: string[];
};

export type PortfolioPerformanceAttribution = {
  version: "perf-attr-v1";
  period: AttributionPeriodId;
  periodLabel: string;
  periodSemantics: string;
  status: AttributionCapabilityStatus;
  calculationMethod: AttributionCalculationMethod;
  unavailableReason: string | null;
  totalReturnPercent: number | null;
  totalReturnAmount: number | null;
  startingPortfolioValue: number | null;
  endingPortfolioValue: number | null;
  holdings: HoldingAttributionRow[];
  assetClasses: AssetClassAttributionRow[];
  contributors: HoldingAttributionRow[];
  detractors: HoldingAttributionRow[];
  conclusions: AttributionConclusion[];
  dataQuality: AttributionDataQuality;
  dataAvailability: PerformanceDataAvailability;
};
