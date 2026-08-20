/**
 * Optional visual brief attached to PeriodIntelligenceReview.
 * Built in the composer from canonical engines. PDF only draws these fields.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export type PeriodReportPerformancePoint = {
  date: string;
  value: number;
};

export type PeriodReportPerformanceChart = {
  points: PeriodReportPerformancePoint[];
  startLabel: string;
  endLabel: string;
  startValueLabel: string;
  endValueLabel: string;
};

export type PeriodReportImpactRow = {
  symbol: string;
  name: string;
  holdingMovePercent: number | null;
  holdingMoveLabel: string | null;
  contributionPp: number;
  contributionPpLabel: string;
};

export type PeriodReportAllocationSlice = {
  groupId: ExposureGroupId;
  label: string;
  displayPercent: number;
  rawPercent: number;
  percentLabel: string;
  valueLabel: string;
};

export type PeriodReportCoverHighlight = {
  label: string;
  value: string;
  detail: string | null;
};

export type PeriodReportGoalVisual =
  | {
      hasGoal: true;
      progressPercent: number;
      currentLabel: string;
      targetLabel: string;
      statusLabel: string;
      projectedLabel: string | null;
      contributionAssumption: string | null;
      stressedLabel: string | null;
    }
  | {
      hasGoal: false;
      prompt: string | null;
    };

export type PeriodReportResilience = {
  score: number | null;
  bandLabel: string | null;
  factors: Array<{ id: string; label: string; explanation: string }>;
};

export type PeriodReportScenarioBar = {
  scenarioId: ScenarioId;
  name: string;
  impactPercent: number;
  impactLabel: string;
};

export type PeriodReportAheadItem = {
  title: string;
  whyItMatters: string;
};

export type PeriodReportHoldingRow = {
  symbol: string;
  name: string;
  weightLabel: string;
  periodMoveLabel: string | null;
  impactLabel: string | null;
  statusLabel: string;
  exposureLabel: string | null;
};

export type PeriodReportFundingNote = {
  periodActivityLabel: string | null;
  coverageNote: string | null;
};

export type PeriodReportBrief = {
  generatedAtLabel: string;
  dataAsOfLabel: string | null;
  coverTitle: string;
  portfolioValueLabel: string | null;
  periodChangeLabel: string | null;
  coverHighlights: PeriodReportCoverHighlight[];
  headline: string;
  thirtySeconds: string[];
  performanceChart: PeriodReportPerformanceChart | null;
  contributors: PeriodReportImpactRow[];
  detractors: PeriodReportImpactRow[];
  showAllocation: boolean;
  allocation: PeriodReportAllocationSlice[];
  allocationInsight: string | null;
  allocationScenarioLink: string | null;
  showGoalVisual: boolean;
  goal: PeriodReportGoalVisual;
  showResilience: boolean;
  resilience: PeriodReportResilience | null;
  showScenarios: boolean;
  scenarios: PeriodReportScenarioBar[];
  aheadItems: PeriodReportAheadItem[];
  showHoldings: boolean;
  holdings: PeriodReportHoldingRow[];
  funding: PeriodReportFundingNote | null;
  methodologyNotes: string[];
};
