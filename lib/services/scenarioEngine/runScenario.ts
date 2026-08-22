/**
 * Phase 2A Scenario Engine — deterministic portfolio stress estimates.
 * Reusable by Analysis UI, later Goal Sensitivity, Resilience, and Market Calmer.
 */

import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { applyExposureShock, round1, roundMoney } from "@/lib/services/scenarioEngine/applyShock";
import {
  getScenarioDefinition,
  SCENARIO_DEFINITIONS,
} from "@/lib/services/scenarioEngine/scenarios";
import {
  listValuedHoldings,
  selectAffectedHoldings,
  sumValues,
} from "@/lib/services/scenarioEngine/selectAffectedExposure";
import type {
  ScenarioAffectedHolding,
  ScenarioDataQuality,
  ScenarioId,
  ScenarioResult,
} from "@/lib/services/scenarioEngine/types";
import {
  assertNoAdvisoryLanguage,
  buildAssumptions,
  buildCoverageNote,
  buildExplanation,
  buildLimitations,
  buildZeroExposureExplanation,
} from "@/lib/services/scenarioEngine/wording";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function resolveDataQuality(input: {
  hasPortfolioValue: boolean;
  definitionShockKind: ReturnType<typeof getScenarioDefinition>["shockKind"];
  unclassifiedHoldingCount: number;
}): ScenarioDataQuality {
  if (!input.hasPortfolioValue) {
    return "insufficient";
  }

  if (
    input.definitionShockKind === "equity_classified" &&
    input.unclassifiedHoldingCount > 0
  ) {
    return "medium";
  }

  return "high";
}

function insufficientResult(
  scenarioId: ScenarioId,
  portfolioTotalValue: number,
  explanation: string,
): ScenarioResult {
  const definition = getScenarioDefinition(scenarioId);
  const result: ScenarioResult = {
    scenarioId: definition.id,
    scenarioName: definition.name,
    status: "insufficient_data",
    shockPercent: definition.shockPercent,
    estimatedPortfolioImpactPercent: null,
    estimatedPortfolioImpactAmount: null,
    affectedPortfolioWeightPercent: null,
    affectedValue: null,
    portfolioTotalValue,
    affectedHoldings: [],
    explanation,
    coverageNote:
      "Scenario impact unavailable because portfolio value cannot be determined reliably from current holdings.",
    assumptions: buildAssumptions(definition),
    limitations: buildLimitations(definition),
    dataQuality: "insufficient",
  };

  assertNoAdvisoryLanguage([
    result.explanation,
    result.coverageNote ?? "",
    ...result.assumptions,
    ...result.limitations,
  ]);

  return result;
}

/**
 * Run a single predefined scenario against current holdings.
 * Uses existing valuation + whole-instrument classification only.
 */
export function runPortfolioScenario(
  holdings: StoredPortfolioHolding[],
  scenarioId: ScenarioId,
): ScenarioResult {
  const definition = getScenarioDefinition(scenarioId);
  const valued = listValuedHoldings(holdings);
  const portfolioTotalValue = sumValues(valued);

  if (!(portfolioTotalValue > 0)) {
    return insufficientResult(
      scenarioId,
      0,
      "Scenario impact unavailable — add valued holdings to estimate hypothetical exposure shocks.",
    );
  }

  const allocation = buildPortfolioExposureAllocation(holdings);
  const affected = selectAffectedHoldings(holdings, definition.shockKind);
  const affectedValue = sumValues(affected);
  const shock = applyExposureShock({
    portfolioTotalValue,
    affectedValue,
    shockPercent: definition.shockPercent,
  });

  if (!shock) {
    return insufficientResult(
      scenarioId,
      portfolioTotalValue,
      "Scenario impact unavailable — shock could not be calculated from current exposure.",
    );
  }

  const affectedHoldings: ScenarioAffectedHolding[] = affected
    .map(({ holding, value }) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      value,
      weightPercent: round1((value / portfolioTotalValue) * 100),
    }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }
      return left.symbol.localeCompare(right.symbol);
    });

  const explanation =
    affectedValue > 0
      ? buildExplanation({
          definition,
          affectedWeightPercent: shock.affectedPortfolioWeightPercent,
        })
      : buildZeroExposureExplanation(definition);

  const coverageNote = buildCoverageNote({
    definition,
    affectedWeightPercent: shock.affectedPortfolioWeightPercent,
    unclassifiedHoldingCount: allocation.unclassifiedHoldingCount,
    excludedHoldingCount: allocation.excludedHoldingCount,
  });

  const result: ScenarioResult = {
    scenarioId: definition.id,
    scenarioName: definition.name,
    status: "ok",
    shockPercent: definition.shockPercent,
    estimatedPortfolioImpactPercent: shock.estimatedPortfolioImpactPercent,
    estimatedPortfolioImpactAmount: shock.estimatedPortfolioImpactAmount,
    affectedPortfolioWeightPercent: shock.affectedPortfolioWeightPercent,
    affectedValue: roundMoney(affectedValue),
    portfolioTotalValue,
    affectedHoldings,
    explanation,
    coverageNote,
    assumptions: buildAssumptions(definition),
    limitations: buildLimitations(definition),
    dataQuality: resolveDataQuality({
      hasPortfolioValue: true,
      definitionShockKind: definition.shockKind,
      unclassifiedHoldingCount: allocation.unclassifiedHoldingCount,
    }),
  };

  assertNoAdvisoryLanguage([
    result.explanation,
    result.coverageNote ?? "",
    ...result.assumptions,
    ...result.limitations,
    result.scenarioName,
  ]);

  return result;
}

/** Run all Phase 2A predefined scenarios (independent — not stacked). */
export function runAllPortfolioScenarios(
  holdings: StoredPortfolioHolding[],
): ScenarioResult[] {
  return SCENARIO_DEFINITIONS.map((definition) =>
    runPortfolioScenario(holdings, definition.id),
  );
}
