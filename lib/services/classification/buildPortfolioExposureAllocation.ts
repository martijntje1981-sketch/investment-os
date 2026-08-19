/**
 * Aggregate whole-instrument exposure weights from existing market values.
 * Does not recalculate prices or FX.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import {
  FIXED_INCOME_TYPE_LABELS,
  type FixedIncomeClassification,
  type FixedIncomeType,
} from "@/lib/services/classification/classifyFixedIncome";
import {
  EXPOSURE_GROUP_IDS,
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
  type PortfolioExposureAllocation,
  type PortfolioExposureGroupSlice,
  type PortfolioExposureHoldingContribution,
  type PortfolioExposureSubgroupSlice,
  type PortfolioFixedIncomeSleeve,
} from "@/lib/services/classification/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const GROUP_SORT_INDEX: Record<ExposureGroupId, number> = {
  technology_communication: 0,
  healthcare: 1,
  consumer: 2,
  financials_real_estate: 3,
  industrials_resources: 4,
  diversified_equity: 5,
  fixed_income: 6,
  other_unclassified: 7,
  crypto: 8,
  cash: 9,
};

const FI_TYPE_ORDER: Record<FixedIncomeType, number> = {
  government: 0,
  corporate: 1,
  inflation_linked: 2,
  mixed_aggregate: 3,
  unknown: 4,
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
      fixedIncome: null,
    };
  }

  const totals = new Map<
    ExposureGroupId,
    {
      value: number;
      holdingCount: number;
      holdings: PortfolioExposureHoldingContribution[];
    }
  >();
  for (const groupId of EXPOSURE_GROUP_IDS) {
    totals.set(groupId, { value: 0, holdingCount: 0, holdings: [] });
  }

  let excludedHoldingCount = 0;
  let classifiedHoldingCount = 0;
  let unclassifiedHoldingCount = 0;
  let includedHoldingCount = 0;
  const fiRows: Array<{
    value: number;
    classification: FixedIncomeClassification;
  }> = [];

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
    bucket.holdings.push({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      value: marketValue,
      assetType: holding.assetType,
    });

    if (
      classification.normalizedGroupId === "fixed_income" &&
      classification.fixedIncome?.isFixedIncome
    ) {
      fiRows.push({
        value: marketValue,
        classification: classification.fixedIncome,
      });
    }
  }

  const nonEmpty = EXPOSURE_GROUP_IDS.map((groupId) => {
    const bucket = totals.get(groupId)!;
    const holdingsSorted = [...bucket.holdings].sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }
      return left.symbol.localeCompare(right.symbol);
    });
    return {
      groupId,
      displayLabel: EXPOSURE_GROUP_LABELS[groupId],
      value: bucket.value,
      holdingCount: bucket.holdingCount,
      holdings: holdingsSorted,
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

  const fixedIncome = buildFixedIncomeSleeve(fiRows, totalValue);

  const groups: PortfolioExposureGroupSlice[] = nonEmpty.map((row, index) => ({
    groupId: row.groupId,
    displayLabel: row.displayLabel,
    value: row.value,
    rawPercent: totalValue > 0 ? (row.value / totalValue) * 100 : 0,
    displayPercent: displayPercents[index] ?? 0,
    holdingCount: row.holdingCount,
    holdings: row.holdings,
    subgroups:
      row.groupId === "fixed_income" ? (fixedIncome?.subgroups ?? []) : undefined,
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
    fixedIncome,
  };
}

function buildFixedIncomeSleeve(
  rows: Array<{ value: number; classification: FixedIncomeClassification }>,
  portfolioTotal: number,
): PortfolioFixedIncomeSleeve | null {
  if (rows.length === 0 || !(portfolioTotal > 0)) return null;

  const sleeveValue = rows.reduce((sum, row) => sum + row.value, 0);
  const byType = new Map<
    FixedIncomeType,
    { value: number; holdingCount: number; confidence: "known" | "inferred" | "unknown" }
  >();
  let durationKnown = 0;
  let durationClassified = 0;
  let creditKnown = 0;
  let creditClassified = 0;
  let governmentValue = 0;
  let longDurationValue = 0;
  let longClassifiedValue = 0;
  let shortClassifiedValue = 0;

  for (const row of rows) {
    const type = row.classification.type;
    const existing = byType.get(type);
    const confidence = row.classification.confidence.type;
    if (!existing) {
      byType.set(type, { value: row.value, holdingCount: 1, confidence });
    } else {
      existing.value += row.value;
      existing.holdingCount += 1;
      if (confidence === "unknown") existing.confidence = "unknown";
      else if (confidence === "inferred" && existing.confidence === "known") {
        existing.confidence = "inferred";
      }
    }
    if (row.classification.confidence.duration === "known") {
      durationKnown += row.value;
    }
    if (row.classification.durationBucket !== "unknown") {
      durationClassified += row.value;
    }
    if (row.classification.confidence.creditQuality === "known") {
      creditKnown += row.value;
    }
    if (row.classification.creditQuality !== "mixed_unknown") {
      creditClassified += row.value;
    }
    if (type === "government" || row.classification.sovereignTreasury) {
      governmentValue += row.value;
    }
    if (row.classification.durationBucket === "long") {
      longDurationValue += row.value;
      longClassifiedValue += row.value;
    }
    if (row.classification.durationBucket === "short") {
      shortClassifiedValue += row.value;
    }
  }

  const typeRows = [...byType.entries()].sort(
    (left, right) => FI_TYPE_ORDER[left[0]] - FI_TYPE_ORDER[right[0]],
  );
  const displayPercents = allocateDisplayPercents(
    typeRows.map(([, row]) => row.value),
  );

  const subgroups: PortfolioExposureSubgroupSlice[] = typeRows.map(
    ([type, row], index) => ({
      subgroupId: `fi_${type}`,
      displayLabel:
        type === "unknown"
          ? "Fixed Income · classification incomplete"
          : FIXED_INCOME_TYPE_LABELS[type],
      type,
      value: row.value,
      rawPercent: (row.value / portfolioTotal) * 100,
      displayPercent: displayPercents[index] ?? 0,
      holdingCount: row.holdingCount,
      confidence: row.confidence,
    }),
  );

  const dominant = [...subgroups].sort((left, right) => right.value - left.value)[0];
  const classificationIncomplete =
    rows.some((row) => row.classification.classificationIncomplete) ||
    (dominant?.type === "unknown" && subgroups.length === 1);

  return {
    weightPercent: (sleeveValue / portfolioTotal) * 100,
    classificationIncomplete,
    subgroups,
    durationKnownSharePercent: (durationKnown / sleeveValue) * 100,
    durationClassifiedSharePercent: (durationClassified / sleeveValue) * 100,
    creditKnownSharePercent: (creditKnown / sleeveValue) * 100,
    creditClassifiedSharePercent: (creditClassified / sleeveValue) * 100,
    dominantType: dominant?.type ?? null,
    majorityIsGovernment: governmentValue / sleeveValue >= 0.5,
    majorityIsLongDuration:
      durationKnown > 0 && longDurationValue / durationKnown >= 0.5,
    majorityIsClassifiedLongDuration:
      durationClassified > 0 && longClassifiedValue / durationClassified >= 0.5,
    majorityIsClassifiedShortDuration:
      durationClassified > 0 && shortClassifiedValue / durationClassified >= 0.5,
  };
}

