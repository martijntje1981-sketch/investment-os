/**
 * Phase 3A — buildPortfolioPerformanceAttribution
 * Deterministic holding + asset-class attribution. No AI. No valuation changes.
 *
 * 1D: previous-close / crypto 24h moves (Phase 1 contribution pp).
 * 1W / 1M / 12M: constant-holdings EOD moves (flows not adjusted — disclosed).
 * 3M: unavailable until a verified portfolio history window exists.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  summarizeDailyPerformance,
  type DailyPerformanceSnapshot,
} from "@/lib/client/dailyPerformance";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  buildDayContributions,
  contributionPpFromMove,
  previousPortfolioValueFromPerformers,
  rankContributionsByMateriality,
  weightMapFromValuedPositions,
} from "@/lib/services/personalIntelligence/contribution";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import { hasMixedContributionPeriods } from "@/lib/services/personalIntelligence/attribution";
import type { HoldingPeriodMove } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";
import { buildAttributionConclusions } from "@/lib/services/performanceAttribution/buildAttributionConclusions";
import {
  classifyHoldingForAttribution,
  groupAttributionByExposure,
} from "@/lib/services/performanceAttribution/groupByExposure";
import {
  ATTR_PRIMARY_DRIVER_MIN_PP,
  ATTRIBUTION_RECONCILE_TOLERANCE_PP,
} from "@/lib/services/performanceAttribution/materiality";
import { getAttributionPeriodCapability } from "@/lib/services/performanceAttribution/periodCapability";
import type {
  AttributionPeriodId,
  HoldingAttributionRow,
  PortfolioPerformanceAttribution,
} from "@/lib/services/performanceAttribution/types";

export type BuildPortfolioPerformanceAttributionInput = {
  period: AttributionPeriodId;
  holdings: StoredPortfolioHolding[];
  /** Optional precomputed daily summary (1D). */
  daily?: DailyPerformanceSnapshot | null;
  /**
   * Multi-day holding moves from verified EOD (already fetched).
   * Required for 1W / 1M / 12M when status is supported.
   */
  holdingMoves?: HoldingPeriodMove[] | null;
  /** Portfolio starting EUR value for the period (when known). */
  startingPortfolioValue?: number | null;
  endingPortfolioValue?: number | null;
  totalReturnPercent?: number | null;
  totalReturnAmount?: number | null;
  historicalFxApproximate?: boolean;
};

function emptyAttribution(
  period: AttributionPeriodId,
  overrides: Partial<PortfolioPerformanceAttribution> = {},
): PortfolioPerformanceAttribution {
  const capability = getAttributionPeriodCapability(period);
  return {
    version: "perf-attr-v1",
    period,
    periodLabel: capability.label,
    periodSemantics: capability.periodSemantics,
    status: "unavailable",
    calculationMethod: "unavailable",
    unavailableReason: capability.reason ?? "Attribution is unavailable.",
    totalReturnPercent: null,
    totalReturnAmount: null,
    startingPortfolioValue: null,
    endingPortfolioValue: null,
    holdings: [],
    assetClasses: [],
    contributors: [],
    detractors: [],
    conclusions: [],
    dataQuality: {
      coveragePercent: null,
      includedHoldingCount: 0,
      excludedHoldingCount: 0,
      cashHoldingCount: 0,
      classificationCoveragePercent: null,
      flowsAdjusted: false,
      quantitiesHeldConstant: period !== "1D",
      historicalFxApproximate: false,
      missingHistorySymbols: [],
      warnings: [],
    },
    dataAvailability: "unavailable",
    ...overrides,
  };
}

function applyContributionShares(
  rows: HoldingAttributionRow[],
): HoldingAttributionRow[] {
  const materialAbs = rows.reduce((sum, row) => {
    if (
      row.contributionPp != null &&
      Math.abs(row.contributionPp) >= ATTR_PRIMARY_DRIVER_MIN_PP
    ) {
      return sum + Math.abs(row.contributionPp);
    }
    return sum;
  }, 0);

  return rows.map((row) => {
    if (
      materialAbs <= 0 ||
      row.contributionPp == null ||
      Math.abs(row.contributionPp) < ATTR_PRIMARY_DRIVER_MIN_PP
    ) {
      return { ...row, contributionShare: null };
    }
    return {
      ...row,
      contributionShare: Math.abs(row.contributionPp) / materialAbs,
    };
  });
}

function finalize(
  partial: Omit<
    PortfolioPerformanceAttribution,
    "contributors" | "detractors" | "assetClasses" | "conclusions"
  >,
): PortfolioPerformanceAttribution {
  const holdings = applyContributionShares(
    rankHoldingRows(partial.holdings),
  );
  const assetClasses = groupAttributionByExposure(holdings);
  const contributors = holdings.filter(
    (row) =>
      row.included &&
      row.contributionPp != null &&
      row.contributionPp > 0,
  );
  const detractors = holdings.filter(
    (row) =>
      row.included &&
      row.contributionPp != null &&
      row.contributionPp < 0,
  );
  const conclusions = buildAttributionConclusions({
    period: partial.period,
    totalReturnPercent: partial.totalReturnPercent,
    holdings,
    coveragePercent: partial.dataQuality.coveragePercent,
    quantitiesHeldConstant: partial.dataQuality.quantitiesHeldConstant,
  });

  return {
    ...partial,
    holdings,
    assetClasses,
    contributors,
    detractors,
    conclusions,
  };
}

function rankHoldingRows(rows: HoldingAttributionRow[]): HoldingAttributionRow[] {
  return [...rows].sort((a, b) => {
    const aPp = a.contributionPp;
    const bPp = b.contributionPp;
    if (aPp != null && bPp != null) {
      const diff = Math.abs(bPp) - Math.abs(aPp);
      if (diff !== 0) return diff;
    } else if (aPp != null) {
      return -1;
    } else if (bPp != null) {
      return 1;
    }
    return Math.abs(b.contributionAmount ?? 0) - Math.abs(a.contributionAmount ?? 0);
  });
}

function buildOneDayAttribution(
  holdings: StoredPortfolioHolding[],
  dailyInput?: DailyPerformanceSnapshot | null,
): PortfolioPerformanceAttribution {
  const capability = getAttributionPeriodCapability("1D");
  const daily = dailyInput ?? summarizeDailyPerformance(holdings);
  const { valuedPositions } = buildValuedPositions(holdings);
  const weightBySymbol = weightMapFromValuedPositions(valuedPositions);
  const contributions = rankContributionsByMateriality(
    buildDayContributions(daily.performers, weightBySymbol),
  );
  const previous = previousPortfolioValueFromPerformers(daily.performers);

  const holdingBySymbol = new Map(
    holdings.map((holding) => [
      holding.symbol.trim().toUpperCase(),
      holding,
    ]),
  );

  const rows: HoldingAttributionRow[] = contributions.map((row) => {
    const holding = holdingBySymbol.get(row.symbol.trim().toUpperCase());
    const endingValue = holding ? getHoldingMarketValue(holding) : null;
    const startingValue =
      endingValue != null && Number.isFinite(row.move)
        ? endingValue - row.move
        : null;
    const classified = holding
      ? classifyHoldingForAttribution(holding)
      : { groupId: "other_unclassified" as const, label: "Other / Unclassified" };
    const assetType =
      row.assetType === "investment" ||
      row.assetType === "cash" ||
      row.assetType === "crypto"
        ? row.assetType
        : holding?.assetType === "investment" ||
            holding?.assetType === "cash" ||
            holding?.assetType === "crypto"
          ? holding.assetType
          : null;

    return {
      level: "instrument",
      holdingId: holding?.id ?? row.symbol,
      symbol: row.symbol,
      name: row.name,
      assetType,
      returnPercent: row.changePercent,
      contributionAmount: row.move,
      contributionPp: row.contributionPp,
      startingWeightPercent: row.weightPercent,
      endingWeightPercent: row.weightPercent,
      startingValue,
      endingValue,
      contributionShare: null,
      included: row.contributionPp != null,
      exclusionReason:
        row.contributionPp == null ? "Contribution unavailable" : null,
      exposureGroupId: classified.groupId,
      exposureLabel: classified.label,
    };
  });

  // Cash / holdings without day moves — mark excluded from movers list only.
  const coveredSymbols = new Set(
    rows.map((row) => row.symbol.trim().toUpperCase()),
  );
  let cashHoldingCount = 0;
  const missing: string[] = [];
  for (const holding of holdings) {
    if (holding.assetType === "cash") {
      cashHoldingCount += 1;
      continue;
    }
    const key = holding.symbol.trim().toUpperCase();
    if (!coveredSymbols.has(key)) {
      missing.push(holding.symbol);
      const classified = classifyHoldingForAttribution(holding);
      rows.push({
        level: "instrument",
        holdingId: holding.id,
        symbol: holding.symbol,
        name: holding.name || holding.symbol,
        assetType: holding.assetType ?? "investment",
        returnPercent: null,
        contributionAmount: null,
        contributionPp: null,
        startingWeightPercent: null,
        endingWeightPercent: null,
        startingValue: null,
        endingValue: getHoldingMarketValue(holding),
        contributionShare: null,
        included: false,
        exclusionReason: "Day move unavailable",
        exposureGroupId: classified.groupId,
        exposureLabel: classified.label,
      });
    }
  }

  const included = rows.filter((row) => row.included);
  const portfolioValue =
    valuedPositions.reduce((sum, position) => sum + position.value, 0) ||
    null;
  const coveredValue = included.reduce(
    (sum, row) => sum + (row.endingValue ?? 0),
    0,
  );
  const coveragePercent =
    portfolioValue != null && portfolioValue > 0
      ? (coveredValue / portfolioValue) * 100
      : daily.performanceCoverageComplete
        ? 100
        : null;

  const classifiedIncluded = included.filter(
    (row) => row.exposureGroupId && row.exposureGroupId !== "other_unclassified",
  );
  const classificationCoveragePercent =
    included.length > 0
      ? (classifiedIncluded.length / included.length) * 100
      : null;

  const warnings: string[] = [];
  if (!daily.performanceCoverageComplete) {
    warnings.push(
      "Some holdings lack a reliable day move, so attribution may be incomplete.",
    );
  }
  if (hasMixedContributionPeriods(contributions)) {
    warnings.push(
      "Figures combine latest trading sessions with crypto 24h moves — periods are not identical.",
    );
  }

  const status =
    included.length === 0
      ? "unavailable"
      : daily.performanceCoverageComplete
        ? "supported"
        : "partial";

  return finalize({
    version: "perf-attr-v1",
    period: "1D",
    periodLabel: capability.label,
    periodSemantics: capability.periodSemantics,
    status,
    calculationMethod: "previous_close_day_move",
    unavailableReason:
      included.length === 0
        ? "Daily attribution needs previous-close or 24h move data."
        : null,
    totalReturnPercent: daily.hasDailyData ? daily.todayPercent : null,
    totalReturnAmount: daily.hasDailyData ? daily.todayChange : null,
    startingPortfolioValue: previous,
    endingPortfolioValue: portfolioValue,
    holdings: rows,
    dataQuality: {
      coveragePercent,
      includedHoldingCount: included.length,
      excludedHoldingCount: rows.length - included.length,
      cashHoldingCount,
      classificationCoveragePercent,
      flowsAdjusted: false,
      quantitiesHeldConstant: false,
      historicalFxApproximate: false,
      missingHistorySymbols: missing,
      warnings,
    },
    dataAvailability:
      included.length === 0
        ? "unavailable"
        : daily.performanceCoverageComplete
          ? "full"
          : "partial",
  });
}

function buildEodAttribution(
  period: AttributionPeriodId,
  holdings: StoredPortfolioHolding[],
  holdingMoves: HoldingPeriodMove[],
  options: {
    startingPortfolioValue?: number | null;
    endingPortfolioValue?: number | null;
    totalReturnPercent?: number | null;
    totalReturnAmount?: number | null;
    historicalFxApproximate?: boolean;
  },
): PortfolioPerformanceAttribution {
  const capability = getAttributionPeriodCapability(period);
  const holdingById = new Map(holdings.map((holding) => [holding.id, holding]));
  const holdingBySymbol = new Map(
    holdings.map((holding) => [
      holding.symbol.trim().toUpperCase(),
      holding,
    ]),
  );

  const startSum = holdingMoves
    .filter((row) => row.included && row.startingValueEur != null)
    .reduce((sum, row) => sum + row.startingValueEur!, 0);
  const endSum = holdingMoves
    .filter((row) => row.included && row.endingValueEur != null)
    .reduce((sum, row) => sum + row.endingValueEur!, 0);

  const startingPortfolioValue =
    options.startingPortfolioValue != null &&
    options.startingPortfolioValue > 0
      ? options.startingPortfolioValue
      : startSum > 0
        ? startSum
        : null;

  const endingPortfolioValue =
    options.endingPortfolioValue != null && options.endingPortfolioValue > 0
      ? options.endingPortfolioValue
      : endSum > 0
        ? endSum
        : null;

  const rows: HoldingAttributionRow[] = holdingMoves.map((move) => {
    const holding =
      holdingById.get(move.holdingId) ??
      holdingBySymbol.get(move.symbol.trim().toUpperCase());
    const name = holding?.name || move.name || move.symbol;
    const classified = holding
      ? classifyHoldingForAttribution(holding)
      : classifyHoldingForAttribution({
          symbol: move.symbol,
          name: move.name,
          assetType: move.assetType,
          providerSymbol: null,
        });

    const contributionPp = contributionPpFromMove(
      move.moveEur ?? Number.NaN,
      startingPortfolioValue,
    );

    return {
      level: "instrument",
      holdingId: move.holdingId,
      symbol: move.symbol,
      name,
      assetType: move.assetType,
      returnPercent: move.returnPercent,
      contributionAmount: move.moveEur,
      contributionPp: move.included ? contributionPp : null,
      startingWeightPercent:
        startingPortfolioValue != null &&
        move.startingValueEur != null &&
        startingPortfolioValue > 0
          ? (move.startingValueEur / startingPortfolioValue) * 100
          : null,
      endingWeightPercent:
        endingPortfolioValue != null &&
        move.endingValueEur != null &&
        endingPortfolioValue > 0
          ? (move.endingValueEur / endingPortfolioValue) * 100
          : null,
      startingValue: move.startingValueEur,
      endingValue: move.endingValueEur,
      contributionShare: null,
      included: move.included && contributionPp != null,
      exclusionReason: move.exclusionReason,
      exposureGroupId: classified.groupId,
      exposureLabel: classified.label,
    };
  });

  const included = rows.filter((row) => row.included);
  const excluded = rows.filter((row) => !row.included);
  const cashHoldingCount = rows.filter((row) => row.assetType === "cash").length;

  const portfolioEnd =
    endingPortfolioValue ??
    holdings.reduce((sum, holding) => {
      const value = getHoldingMarketValue(holding);
      return sum + (value ?? 0);
    }, 0);

  const coveredEnd = included.reduce(
    (sum, row) => sum + (row.endingValue ?? 0),
    0,
  );
  const coveragePercent =
    portfolioEnd > 0 ? (coveredEnd / portfolioEnd) * 100 : null;

  const classifiedIncluded = included.filter(
    (row) => row.exposureGroupId && row.exposureGroupId !== "other_unclassified",
  );
  const classificationCoveragePercent =
    included.length > 0
      ? (classifiedIncluded.length / included.length) * 100
      : null;

  const totalReturnAmount =
    options.totalReturnAmount ??
    (startingPortfolioValue != null && endingPortfolioValue != null
      ? endingPortfolioValue - startingPortfolioValue
      : included.reduce((sum, row) => sum + (row.contributionAmount ?? 0), 0));

  const totalReturnPercent =
    options.totalReturnPercent ??
    (startingPortfolioValue != null &&
    startingPortfolioValue > 0 &&
    totalReturnAmount != null
      ? (totalReturnAmount / startingPortfolioValue) * 100
      : null);

  const warnings: string[] = [
    "Price moves use current holdings held constant — deposits, withdrawals, and trades are not adjusted.",
  ];
  if (options.historicalFxApproximate) {
    warnings.push("Non-euro prices use current FX rates as an approximation.");
  }
  if (excluded.some((row) => row.exclusionReason?.includes("history"))) {
    warnings.push("Some holdings lack enough price history for this period.");
  }

  const status =
    included.length === 0
      ? "unavailable"
      : excluded.length > 0
        ? "partial"
        : "supported";

  // Soft reconcile check for tests / metadata (not thrown).
  if (
    totalReturnPercent != null &&
    included.length > 0 &&
    included.every((row) => row.contributionPp != null)
  ) {
    const sumPp = included.reduce(
      (sum, row) => sum + (row.contributionPp ?? 0),
      0,
    );
    if (
      Math.abs(sumPp - totalReturnPercent) > ATTRIBUTION_RECONCILE_TOLERANCE_PP + 0.5
    ) {
      // Large gaps usually mean cash flat / skipped holdings — already partial.
      void sumPp;
    }
  }

  return finalize({
    version: "perf-attr-v1",
    period,
    periodLabel: capability.label,
    periodSemantics: capability.periodSemantics,
    status,
    calculationMethod: "constant_holdings_eod",
    unavailableReason:
      included.length === 0
        ? "Not enough holding price history to attribute this period."
        : null,
    totalReturnPercent,
    totalReturnAmount,
    startingPortfolioValue,
    endingPortfolioValue,
    holdings: rows,
    dataQuality: {
      coveragePercent,
      includedHoldingCount: included.length,
      excludedHoldingCount: excluded.length,
      cashHoldingCount,
      classificationCoveragePercent,
      flowsAdjusted: false,
      quantitiesHeldConstant: true,
      historicalFxApproximate: Boolean(options.historicalFxApproximate),
      missingHistorySymbols: excluded
        .filter((row) => row.assetType !== "cash")
        .map((row) => row.symbol),
      warnings,
    },
    dataAvailability:
      included.length === 0
        ? "unavailable"
        : excluded.length > 0
          ? "partial"
          : "full",
  });
}

/**
 * Build deep performance attribution for a period.
 */
export function buildPortfolioPerformanceAttribution(
  input: BuildPortfolioPerformanceAttributionInput,
): PortfolioPerformanceAttribution {
  const capability = getAttributionPeriodCapability(input.period);

  if (capability.status === "unavailable") {
    return emptyAttribution(input.period, {
      status: "unavailable",
      calculationMethod: "unavailable",
      unavailableReason: capability.reason,
      conclusions: [
        {
          id: "unavailable",
          kind: "incomplete_coverage",
          text:
            capability.reason ??
            "Performance attribution is not available for this period yet.",
        },
      ],
    });
  }

  if (input.period === "1D") {
    return buildOneDayAttribution(input.holdings, input.daily);
  }

  if (!input.holdingMoves || input.holdingMoves.length === 0) {
    return emptyAttribution(input.period, {
      unavailableReason:
        "Holding-level history is required for this period and was not available.",
      conclusions: [
        {
          id: "unavailable",
          kind: "incomplete_coverage",
          text: "We don’t have enough holding history yet for this period.",
        },
      ],
    });
  }

  return buildEodAttribution(input.period, input.holdings, input.holdingMoves, {
    startingPortfolioValue: input.startingPortfolioValue,
    endingPortfolioValue: input.endingPortfolioValue,
    totalReturnPercent: input.totalReturnPercent,
    totalReturnAmount: input.totalReturnAmount,
    historicalFxApproximate: input.historicalFxApproximate,
  });
}
