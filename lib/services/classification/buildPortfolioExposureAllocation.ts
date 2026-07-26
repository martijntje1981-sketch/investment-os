/**
 * Aggregate whole-instrument exposure weights from existing market values.
 * Does not recalculate prices or FX.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import {
  EXPOSURE_GROUP_IDS,
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
  type PortfolioExposureAllocation,
  type PortfolioExposureGroupSlice,
} from "@/lib/services/classification/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const GROUP_SORT_INDEX: Record<ExposureGroupId, number> = {
  technology_communication: 0,
  healthcare: 1,
  consumer: 2,
  financials_real_estate: 3,
  industrials_resources: 4,
  diversified_equity: 5,
  other_unclassified: 6,
  crypto: 7,
  cash: 8,
};

/**
 * Deterministic largest-remainder integer percentages that sum to 100
 * when total > 0.
 */
export function allocateDisplayPercents(rawWeights: number[]): number[] {
  if (rawWeights.length === 0) {
    return [];
  }

  const total = rawWeights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0) || !Number.isFinite(total)) {
    return rawWeights.map(() => 0);
  }

  const exact = rawWeights.map((value) => (value / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  const remainder = 100 - floors.reduce((sum, value) => sum + value, 0);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - floors[index]! }))
    .sort((left, right) => {
      if (right.fraction !== left.fraction) {
        return right.fraction - left.fraction;
      }
      return left.index - right.index;
    });

  const result = [...floors];
  for (let step = 0; step < remainder; step += 1) {
    const target = byFraction[step];
    if (!target) {
      break;
    }
    result[target.index] = (result[target.index] ?? 0) + 1;
  }

  return result;
}

export function buildPortfolioExposureAllocation(
  holdings: StoredPortfolioHolding[],
): PortfolioExposureAllocation {
  if (holdings.length === 0) {
    return {
      groups: [],
      totalValue: 0,
      classifiedHoldingCount: 0,
      unclassifiedHoldingCount: 0,
      excludedHoldingCount: 0,
      includedHoldingCount: 0,
      hasAnyValue: false,
      coverageLabel: null,
    };
  }

  const totals = new Map<ExposureGroupId, { value: number; holdingCount: number }>();
  for (const groupId of EXPOSURE_GROUP_IDS) {
    totals.set(groupId, { value: 0, holdingCount: 0 });
  }

  let excludedHoldingCount = 0;
  let classifiedHoldingCount = 0;
  let unclassifiedHoldingCount = 0;
  let includedHoldingCount = 0;

  for (const holding of holdings) {
    const marketValue = getHoldingMarketValue(holding);
    if (
      marketValue === null ||
      !Number.isFinite(marketValue) ||
      marketValue <= 0
    ) {
      excludedHoldingCount += 1;
      continue;
    }

    const classification = classifyHoldingExposure(holding);
    includedHoldingCount += 1;

    if (classification.normalizedGroupId === "other_unclassified") {
      unclassifiedHoldingCount += 1;
    } else {
      classifiedHoldingCount += 1;
    }

    const bucket = totals.get(classification.normalizedGroupId)!;
    bucket.value += marketValue;
    bucket.holdingCount += 1;
  }

  const nonEmpty = EXPOSURE_GROUP_IDS.map((groupId) => {
    const bucket = totals.get(groupId)!;
    return {
      groupId,
      displayLabel: EXPOSURE_GROUP_LABELS[groupId],
      value: bucket.value,
      holdingCount: bucket.holdingCount,
    };
  }).filter((row) => row.value > 0 && row.holdingCount > 0);

  nonEmpty.sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }
    return GROUP_SORT_INDEX[left.groupId] - GROUP_SORT_INDEX[right.groupId];
  });

  const totalValue = nonEmpty.reduce((sum, row) => sum + row.value, 0);
  const displayPercents = allocateDisplayPercents(
    nonEmpty.map((row) => row.value),
  );

  const groups: PortfolioExposureGroupSlice[] = nonEmpty.map((row, index) => ({
    groupId: row.groupId,
    displayLabel: row.displayLabel,
    value: row.value,
    rawPercent: totalValue > 0 ? (row.value / totalValue) * 100 : 0,
    displayPercent: displayPercents[index] ?? 0,
    holdingCount: row.holdingCount,
  }));

  let coverageLabel: string | null = null;
  if (totalValue > 0) {
    const notes: string[] = [];
    if (unclassifiedHoldingCount > 0) {
      notes.push(
        `${unclassifiedHoldingCount} holding${unclassifiedHoldingCount === 1 ? "" : "s"} unclassified`,
      );
    }
    if (excludedHoldingCount > 0) {
      notes.push(
        `${excludedHoldingCount} without usable value excluded`,
      );
    }
    coverageLabel = notes.length > 0 ? notes.join(" · ") : null;
  } else if (excludedHoldingCount > 0) {
    coverageLabel = "Exposure requires available holding values.";
  }

  return {
    groups,
    totalValue,
    classifiedHoldingCount,
    unclassifiedHoldingCount,
    excludedHoldingCount,
    includedHoldingCount,
    hasAnyValue: totalValue > 0,
    coverageLabel,
  };
}
