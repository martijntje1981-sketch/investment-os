/**
 * Phase 17 — personal allocation intelligence on top of canonical exposure.
 * Whole-instrument classification only. Not ETF X-Ray.
 */

import type { ExposureGroupId } from "@/lib/services/classification";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export type AllocationInsightKind =
  | "empty"
  | "dominant"
  | "two_largest"
  | "unclassified_coverage"
  | "spread";

export type AllocationIntelligenceHolding = {
  id: string;
  symbol: string;
  name: string;
  value: number;
  /** Share of total portfolio value. */
  weightPercent: number;
  assetType?: "investment" | "cash" | "crypto";
};

export type AllocationIntelligenceGroup = {
  groupId: ExposureGroupId;
  displayLabel: string;
  value: number;
  rawPercent: number;
  displayPercent: number;
  holdingCount: number;
  holdings: AllocationIntelligenceHolding[];
  isUnclassified: boolean;
  isCash: boolean;
  isFixedIncome: boolean;
};

export type AllocationInsight = {
  kind: AllocationInsightKind;
  sentence: string;
};

export type AllocationScenarioLink = {
  groupId: ExposureGroupId;
  groupLabel: string;
  scenarioId: ScenarioId;
  scenarioName: string;
  /** Share of the shocked sleeve that sits in this allocation group (0–100). */
  affectedGroupSharePercent: number;
  sentence: string;
};

export type AllocationIntelligence = {
  groups: AllocationIntelligenceGroup[];
  totalValue: number;
  classifiedGroupCount: number;
  classifiedHoldingCount: number;
  unclassifiedHoldingCount: number;
  unclassifiedRawPercent: number;
  classifiedValuePercent: number;
  coverageSentence: string | null;
  insight: AllocationInsight;
  scenarioLink: AllocationScenarioLink | null;
  hasFixedIncome: boolean;
  fixedIncomeRawPercent: number;
  bondsRatesHref: string;
  analysisHref: string;
};
