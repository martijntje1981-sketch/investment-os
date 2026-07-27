/**
 * Top performers by exposure category — uses only already-loaded holding
 * prices and the central classifyHoldingExposure taxonomy. Zero provider calls.
 */

import {
  hasValidDailyPerformance,
  resolveHoldingChangePercent,
} from "@/lib/client/dailyPerformance";
import {
  formatMoverPeriodLabel,
  resolveHoldingMovePeriod,
  resolvePortfolioMovePeriod,
} from "@/lib/client/performancePeriod";
import { classifyHoldingExposure } from "@/lib/services/classification";
import {
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
} from "@/lib/services/classification/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const TOP_PERFORMERS_PER_CATEGORY = 3;

export type TopPerformerHolding = {
  id: string;
  symbol: string;
  name: string;
  changePercent: number;
  changeAmount: number | null;
  periodLabel: string;
  periodAccessibleDescription: string;
  groupId: ExposureGroupId;
};

export type TopPerformersCategoryGroup = {
  groupId: ExposureGroupId;
  displayLabel: string;
  holdings: TopPerformerHolding[];
};

export type TopPerformersByCategoryResult = {
  groups: TopPerformersCategoryGroup[];
  sectionPeriodLabel: string;
  sectionPeriodDetail: string | null;
  usesLastSessionWording: boolean;
  classification: {
    classified: Array<{ symbol: string; groupId: ExposureGroupId; label: string }>;
    unclassified: Array<{ symbol: string }>;
  };
};

function isComparableHolding(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType === "cash") {
    return false;
  }

  if (
    holding.priceDataStatus === "unavailable" ||
    holding.priceDataStatus === "stale"
  ) {
    return false;
  }

  if (!hasValidDailyPerformance(holding)) {
    return false;
  }

  const changePercent = resolveHoldingChangePercent(holding);
  return changePercent !== null && Number.isFinite(changePercent);
}

function compareTopPerformers(
  a: TopPerformerHolding,
  b: TopPerformerHolding,
): number {
  if (b.changePercent !== a.changePercent) {
    return b.changePercent - a.changePercent;
  }
  const symbolCompare = a.symbol.localeCompare(b.symbol);
  if (symbolCompare !== 0) {
    return symbolCompare;
  }
  return a.name.localeCompare(b.name);
}

function toTopPerformer(
  holding: StoredPortfolioHolding,
  groupId: ExposureGroupId,
): TopPerformerHolding | null {
  const changePercent = resolveHoldingChangePercent(holding);
  if (changePercent === null || !Number.isFinite(changePercent)) {
    return null;
  }

  const period = resolveHoldingMovePeriod(holding);
  const changeAmount =
    typeof holding.changeAmount === "number" && Number.isFinite(holding.changeAmount)
      ? holding.changeAmount
      : typeof holding.change24hAmount === "number" &&
          Number.isFinite(holding.change24hAmount)
        ? holding.change24hAmount
        : null;

  return {
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    changePercent,
    changeAmount,
    periodLabel: formatMoverPeriodLabel(holding),
    periodAccessibleDescription: period.accessibleDescription,
    groupId,
  };
}

/** Build up to three top movers per exposure category from loaded holdings. */
export function buildTopPerformersByCategory(
  holdings: StoredPortfolioHolding[],
): TopPerformersByCategoryResult {
  const classified: TopPerformersByCategoryResult["classification"]["classified"] =
    [];
  const unclassified: TopPerformersByCategoryResult["classification"]["unclassified"] =
    [];
  const byGroup = new Map<ExposureGroupId, TopPerformerHolding[]>();
  const eligibleHoldings: StoredPortfolioHolding[] = [];

  for (const holding of holdings) {
    if (holding.assetType === "cash") {
      continue;
    }

    const classification = classifyHoldingExposure(holding);
    if (classification.normalizedGroupId === "other_unclassified") {
      unclassified.push({ symbol: holding.symbol });
    } else {
      classified.push({
        symbol: holding.symbol,
        groupId: classification.normalizedGroupId,
        label: classification.displayLabel,
      });
    }

    if (classification.normalizedGroupId === "cash") {
      continue;
    }

    if (!isComparableHolding(holding)) {
      continue;
    }

    const performer = toTopPerformer(
      holding,
      classification.normalizedGroupId,
    );
    if (!performer) {
      continue;
    }

    eligibleHoldings.push(holding);
    const existing = byGroup.get(classification.normalizedGroupId) ?? [];
    existing.push(performer);
    byGroup.set(classification.normalizedGroupId, existing);
  }

  const groups: TopPerformersCategoryGroup[] = [...byGroup.entries()]
    .map(([groupId, groupHoldings]) => ({
      groupId,
      displayLabel: EXPOSURE_GROUP_LABELS[groupId],
      holdings: [...groupHoldings]
        .sort(compareTopPerformers)
        .slice(0, TOP_PERFORMERS_PER_CATEGORY),
    }))
    .filter((group) => group.holdings.length > 0)
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));

  const portfolioPeriod = resolvePortfolioMovePeriod(eligibleHoldings);
  const usesLastSessionWording =
    portfolioPeriod.kind === "last_session" ||
    portfolioPeriod.kind === "mixed" ||
    portfolioPeriod.kind === "latest_sessions";

  return {
    groups,
    sectionPeriodLabel: portfolioPeriod.primaryLabel,
    sectionPeriodDetail: portfolioPeriod.detail,
    usesLastSessionWording,
    classification: { classified, unclassified },
  };
}
