/**
 * Deterministic allocation conclusions from canonical exposure + optional scenarios.
 * Does not reclassify holdings or redistribute unclassified weight.
 */

import {
  formatAllocationPercent,
  type PortfolioExposureAllocation,
  type PortfolioExposureGroupSlice,
} from "@/lib/services/classification";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { pickMostSensitiveScenario } from "@/lib/services/resilience";
import type { ScenarioResult } from "@/lib/services/scenarioEngine";
import type {
  AllocationInsight,
  AllocationIntelligence,
  AllocationIntelligenceGroup,
  AllocationIntelligenceHolding,
  AllocationScenarioLink,
} from "@/lib/services/allocationIntelligence/types";

/** Largest group is a meaningful concentration / dominant sleeve. */
export const ALLOCATION_DOMINANT_PERCENT = 40;
/** Combined weight of the two largest groups. */
export const ALLOCATION_TWO_LARGEST_PERCENT = 65;
/** Unclassified insight when no stronger concentration observation applies. */
export const ALLOCATION_UNCLASSIFIED_INSIGHT_PERCENT = 8;
/** Coverage footnote — skip noise when almost everything is classified. */
export const ALLOCATION_COVERAGE_NOTE_PERCENT = 5;
/** Minimum share of shocked sleeve that must sit in one allocation group. */
export const ALLOCATION_SCENARIO_GROUP_SHARE = 2 / 3;
const MEANINGFUL_SCENARIO_IMPACT_PERCENT = 0.5;

function holdingWeightPercent(
  value: number,
  totalValue: number,
): number {
  if (!(totalValue > 0) || !Number.isFinite(value)) return 0;
  return (value / totalValue) * 100;
}

function toGroup(
  slice: PortfolioExposureGroupSlice,
  totalValue: number,
): AllocationIntelligenceGroup {
  const holdings: AllocationIntelligenceHolding[] = slice.holdings.map(
    (holding) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      value: holding.value,
      weightPercent: holdingWeightPercent(holding.value, totalValue),
      assetType: holding.assetType,
    }),
  );

  return {
    groupId: slice.groupId,
    displayLabel: slice.displayLabel,
    value: slice.value,
    rawPercent: slice.rawPercent,
    displayPercent: slice.displayPercent,
    holdingCount: slice.holdingCount,
    holdings,
    isUnclassified: slice.groupId === "other_unclassified",
    isCash: slice.groupId === "cash",
    isFixedIncome: slice.groupId === "fixed_income",
  };
}

function buildInsight(groups: AllocationIntelligenceGroup[]): AllocationInsight {
  if (groups.length === 0) {
    return {
      kind: "empty",
      sentence: "Add valued holdings to see portfolio exposure.",
    };
  }

  const largest = groups[0]!;
  const second = groups[1] ?? null;
  const twoLargestPercent = largest.rawPercent + (second?.rawPercent ?? 0);
  const classifiedGroupCount = groups.filter((group) => !group.isUnclassified)
    .length;
  const unclassified = groups.find((group) => group.isUnclassified) ?? null;

  if (largest.rawPercent >= ALLOCATION_DOMINANT_PERCENT) {
    return {
      kind: "dominant",
      sentence: `${largest.displayLabel} is your largest allocation at ${formatAllocationPercent(largest.rawPercent)}.`,
    };
  }

  if (second && twoLargestPercent >= ALLOCATION_TWO_LARGEST_PERCENT) {
    return {
      kind: "two_largest",
      sentence: `Your two largest allocation groups represent ${formatAllocationPercent(twoLargestPercent)} of your portfolio.`,
    };
  }

  if (
    unclassified &&
    unclassified.rawPercent >= ALLOCATION_UNCLASSIFIED_INSIGHT_PERCENT
  ) {
    return {
      kind: "unclassified_coverage",
      sentence: `Your portfolio is spread across ${classifiedGroupCount} classified allocation group${classifiedGroupCount === 1 ? "" : "s"}, with ${formatAllocationPercent(unclassified.rawPercent)} currently unclassified.`,
    };
  }

  return {
    kind: "spread",
    sentence: `Your portfolio is spread across ${classifiedGroupCount} classified allocation group${classifiedGroupCount === 1 ? "" : "s"}.`,
  };
}

function buildCoverageSentence(
  allocation: PortfolioExposureAllocation,
  unclassifiedRawPercent: number,
  classifiedValuePercent: number,
): string | null {
  if (allocation.unclassifiedHoldingCount <= 0) return null;
  if (unclassifiedRawPercent < ALLOCATION_COVERAGE_NOTE_PERCENT) return null;

  const holdingWord =
    allocation.unclassifiedHoldingCount === 1 ? "holding" : "holdings";
  return `${formatAllocationPercent(classifiedValuePercent)} of portfolio value classified · ${allocation.unclassifiedHoldingCount} ${holdingWord} unclassified`;
}

function findGroupForHolding(
  groups: AllocationIntelligenceGroup[],
  holding: { id: string; symbol: string },
): AllocationIntelligenceGroup | null {
  const byId = groups.find((group) =>
    group.holdings.some((row) => row.id === holding.id),
  );
  if (byId) return byId;
  const symbol = holding.symbol.trim().toUpperCase();
  if (!symbol) return null;
  return (
    groups.find((group) =>
      group.holdings.some((row) => row.symbol.trim().toUpperCase() === symbol),
    ) ?? null
  );
}

function buildScenarioLink(
  groups: AllocationIntelligenceGroup[],
  scenarioResults: ScenarioResult[] | null | undefined,
): AllocationScenarioLink | null {
  if (!scenarioResults || scenarioResults.length === 0) return null;

  const mostSensitive = pickMostSensitiveScenario(scenarioResults);
  if (!mostSensitive) return null;
  if (
    Math.abs(mostSensitive.estimatedPortfolioImpactPercent) <
    MEANINGFUL_SCENARIO_IMPACT_PERCENT
  ) {
    return null;
  }

  const result = scenarioResults.find(
    (row) =>
      row.scenarioId === mostSensitive.scenarioId && row.status === "ok",
  );
  if (!result || result.affectedHoldings.length === 0) return null;

  const affectedValue =
    result.affectedValue != null && result.affectedValue > 0
      ? result.affectedValue
      : result.affectedHoldings.reduce((sum, row) => sum + row.value, 0);
  if (!(affectedValue > 0)) return null;

  const contribution = new Map<string, number>();
  for (const holding of result.affectedHoldings) {
    const group = findGroupForHolding(groups, holding);
    if (!group || group.isUnclassified) continue;
    contribution.set(
      group.groupId,
      (contribution.get(group.groupId) ?? 0) + holding.value,
    );
  }

  let leadingGroupId: string | null = null;
  let leadingValue = 0;
  for (const [groupId, value] of contribution) {
    if (value > leadingValue) {
      leadingGroupId = groupId;
      leadingValue = value;
    }
  }

  if (!leadingGroupId || leadingValue / affectedValue < ALLOCATION_SCENARIO_GROUP_SHARE) {
    return null;
  }

  const group = groups.find((row) => row.groupId === leadingGroupId);
  if (!group) return null;

  return {
    groupId: group.groupId,
    groupLabel: group.displayLabel,
    scenarioId: result.scenarioId,
    scenarioName: result.scenarioName,
    affectedGroupSharePercent: (leadingValue / affectedValue) * 100,
    sentence: `${group.displayLabel} is also the main reason the ${result.scenarioName} scenario has the largest modeled impact on this portfolio.`,
  };
}

export function buildAllocationIntelligence(input: {
  allocation: PortfolioExposureAllocation;
  scenarioResults?: ScenarioResult[] | null;
}): AllocationIntelligence {
  const { allocation } = input;
  const groups = allocation.groups.map((slice) =>
    toGroup(slice, allocation.totalValue),
  );
  const unclassified = groups.find((group) => group.isUnclassified) ?? null;
  const unclassifiedRawPercent = unclassified?.rawPercent ?? 0;
  const classifiedValuePercent = Math.max(0, 100 - unclassifiedRawPercent);
  const classifiedGroupCount = groups.filter((group) => !group.isUnclassified)
    .length;
  const fixedIncome = groups.find((group) => group.isFixedIncome) ?? null;

  return {
    groups,
    totalValue: allocation.totalValue,
    classifiedGroupCount,
    classifiedHoldingCount: allocation.classifiedHoldingCount,
    unclassifiedHoldingCount: allocation.unclassifiedHoldingCount,
    unclassifiedRawPercent,
    classifiedValuePercent,
    coverageSentence: buildCoverageSentence(
      allocation,
      unclassifiedRawPercent,
      classifiedValuePercent,
    ),
    insight: buildInsight(groups),
    scenarioLink: buildScenarioLink(groups, input.scenarioResults),
    hasFixedIncome: Boolean(fixedIncome),
    fixedIncomeRawPercent: fixedIncome?.rawPercent ?? 0,
    bondsRatesHref: DASHBOARD_DEEP_LINKS.bondsRates,
    analysisHref: DASHBOARD_DEEP_LINKS.portfolioExposure,
  };
}
