/**
 * Collect canonical stance inputs from live holdings, Evolution state, or snapshots.
 * Never backfill historical inputs from current holdings.
 */

import {
  buildPortfolioAnalysis,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import {
  buildPortfolioExposureAllocation,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";
import {
  DIVERSIFICATION_COUNTABLE_GROUPS,
  DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
} from "@/lib/services/portfolio/healthScore/config";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";
import type { StanceInputs } from "@/lib/services/portfolioStance/types";
import type { ResilienceProfile } from "@/lib/services/resilience";
import { pickMostSensitiveScenario } from "@/lib/services/resilience/factors";
import { runRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import type { ExposureGroupId } from "@/lib/services/classification/types";
import { EXPOSURE_GROUP_IDS } from "@/lib/services/classification/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

const COUNTABLE = new Set<string>(DIVERSIFICATION_COUNTABLE_GROUPS);

function emptyWeights(): Partial<Record<ExposureGroupId, number>> {
  const weights: Partial<Record<ExposureGroupId, number>> = {};
  for (const id of EXPOSURE_GROUP_IDS) {
    weights[id] = 0;
  }
  return weights;
}

function distinctClassifiedCount(
  weights: Partial<Record<ExposureGroupId, number>>,
): number {
  return EXPOSURE_GROUP_IDS.filter(
    (id) =>
      COUNTABLE.has(id) &&
      (weights[id] ?? 0) >= DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
  ).length;
}

function stabilizingLargest(input: {
  largestHoldingWeightPercent: number | null;
  cashWeight: number;
  fixedIncomeWeight: number;
  unclassifiedWeight: number;
}): boolean {
  const largest = input.largestHoldingWeightPercent;
  if (largest == null || !(largest > 0)) return true;
  const slack = 0.6;
  return (
    input.cashWeight >= largest - slack ||
    input.fixedIncomeWeight >= largest - slack ||
    input.unclassifiedWeight >= largest - slack
  );
}

export function collectStanceInputsFromAllocation(input: {
  allocation: PortfolioExposureAllocation;
  analysis?: PortfolioAnalysisSnapshot | null;
  mostSensitive?: {
    scenarioId: ScenarioId;
    scenarioName: string;
    estimatedPortfolioImpactPercent: number;
  } | null;
  sourceQuality: StanceInputs["sourceQuality"];
}): StanceInputs {
  const weights = emptyWeights();
  for (const group of input.allocation.groups) {
    weights[group.groupId] = group.rawPercent;
  }
  const unclassified = weights.other_unclassified ?? 0;
  const cash = weights.cash ?? 0;
  const fixedIncome = weights.fixed_income ?? 0;
  const largest = input.analysis?.largestPosition ?? null;

  return {
    groupWeights: weights,
    unclassifiedWeightPercent: unclassified,
    largestHoldingWeightPercent: largest?.weightPercent ?? null,
    largestHoldingLabel: largest
      ? `${largest.holding.name} (${largest.holding.symbol})`
      : null,
    largestHoldingIsStabilizing: stabilizingLargest({
      largestHoldingWeightPercent: largest?.weightPercent ?? null,
      cashWeight: cash,
      fixedIncomeWeight: fixedIncome,
      unclassifiedWeight: unclassified,
    }),
    modeledImpactPercent:
      input.mostSensitive?.estimatedPortfolioImpactPercent ?? null,
    modeledScenarioId: input.mostSensitive?.scenarioId ?? null,
    modeledScenarioName: input.mostSensitive?.scenarioName ?? null,
    distinctClassifiedGroupCount: distinctClassifiedCount(weights),
    portfolioValueAvailable: input.allocation.hasAnyValue,
    sourceQuality: input.sourceQuality,
  };
}

export function collectStanceInputsFromHoldings(input: {
  holdings: StoredPortfolioHolding[];
  allocation?: PortfolioExposureAllocation | null;
  analysis?: PortfolioAnalysisSnapshot | null;
  resilience?: ResilienceProfile | null;
}): StanceInputs {
  const allocation =
    input.allocation ?? buildPortfolioExposureAllocation(input.holdings);
  const analysis = input.analysis ?? buildPortfolioAnalysis(input.holdings);
  const mostSensitive =
    input.resilience?.mostSensitive ??
    pickMostSensitiveScenario(runRelevantPortfolioScenarios(input.holdings));

  return collectStanceInputsFromAllocation({
    allocation,
    analysis,
    mostSensitive,
    sourceQuality: "current",
  });
}

export function collectStanceInputsFromNowState(
  state: EvolutionNowState,
): StanceInputs | null {
  if (!state.portfolioValueAvailable && !(state.portfolioValue != null && state.portfolioValue > 0)) {
    return null;
  }
  if (state.exposure.length === 0) return null;

  const weights = emptyWeights();
  for (const group of state.exposure) {
    weights[group.groupId] = group.weightPercent;
  }
  const unclassified = weights.other_unclassified ?? 0;
  const cash = weights.cash ?? 0;
  const fixedIncome = weights.fixed_income ?? 0;

  return {
    groupWeights: weights,
    unclassifiedWeightPercent: unclassified,
    largestHoldingWeightPercent: state.largestHoldingWeightPercent,
    largestHoldingLabel:
      state.largestHoldingName ?? state.largestHoldingSymbol,
    largestHoldingIsStabilizing: stabilizingLargest({
      largestHoldingWeightPercent: state.largestHoldingWeightPercent,
      cashWeight: cash,
      fixedIncomeWeight: fixedIncome,
      unclassifiedWeight: unclassified,
    }),
    modeledImpactPercent: state.scenarioImpactPercent,
    modeledScenarioId: (state.scenarioId as ScenarioId | null) ?? null,
    modeledScenarioName: state.scenarioName,
    distinctClassifiedGroupCount: distinctClassifiedCount(weights),
    portfolioValueAvailable: true,
    sourceQuality: "stored_snapshot",
  };
}

export function collectStanceInputsFromSnapshot(
  snapshot: IntelligenceStateSnapshot,
): StanceInputs | null {
  const payload = snapshot.payload;
  if (!payload.portfolio.coverage.portfolioValueAvailable) return null;
  if (!payload.exposure.groups.some((group) => group.weightPercent > 0)) {
    return null;
  }

  const weights = emptyWeights();
  for (const group of payload.exposure.groups) {
    weights[group.groupId] = group.weightPercent;
  }
  const unclassified =
    weights.other_unclassified ??
    (payload.exposure.unclassifiedHoldingCount > 0 &&
    payload.exposure.classifiedHoldingCount +
      payload.exposure.unclassifiedHoldingCount >
      0
      ? (payload.exposure.unclassifiedHoldingCount /
          (payload.exposure.classifiedHoldingCount +
            payload.exposure.unclassifiedHoldingCount)) *
        100
      : 0);
  const cash = weights.cash ?? 0;
  const fixedIncome = weights.fixed_income ?? 0;
  const sensitive = payload.resilience?.mostSensitive ?? null;

  return {
    groupWeights: weights,
    unclassifiedWeightPercent: unclassified,
    largestHoldingWeightPercent:
      payload.concentration.largestHoldingWeightPercent,
    largestHoldingLabel:
      payload.concentration.largestHoldingName ??
      payload.concentration.largestHoldingSymbol,
    largestHoldingIsStabilizing: stabilizingLargest({
      largestHoldingWeightPercent:
        payload.concentration.largestHoldingWeightPercent,
      cashWeight: cash,
      fixedIncomeWeight: fixedIncome,
      unclassifiedWeight: unclassified,
    }),
    modeledImpactPercent: sensitive?.estimatedPortfolioImpactPercent ?? null,
    modeledScenarioId: sensitive?.scenarioId ?? null,
    modeledScenarioName: sensitive?.scenarioName ?? null,
    distinctClassifiedGroupCount: distinctClassifiedCount(weights),
    portfolioValueAvailable: true,
    sourceQuality: "stored_snapshot",
  };
}
