"use client";

import { useMemo, useState } from "react";

import { PortfolioHistoryNavCard } from "@/components/portfolioHistory/PortfolioHistoryNavCard";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  buildValuedPositions,
} from "@/lib/client/portfolioAnalysis";
import {
  canExportPortfolio,
  downloadPortfolioWorkbook,
  mapHoldingsForHistoryExport,
} from "@/lib/client/portfolioExport";
import { formatContributionBaseAmount } from "@/lib/client/contributionsFormat";
import { useCashIntelligence } from "@/lib/client/useCashIntelligence";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { useUserGoal } from "@/lib/client/useUserGoal";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/**
 * Dashboard Portfolio History preview — reuses existing month/week series
 * and contribution data. Export uses the shared Portfolio workbook builder.
 */
export function DashboardPortfolioHistorySection({
  holdings,
  history,
  portfolioValue,
  portfolioValueAvailable,
  emphasisNote = null,
}: {
  holdings: StoredPortfolioHolding[];
  history: PortfolioPerformanceHistoryApiResponse | null;
  portfolioValue: number;
  portfolioValueAvailable: boolean;
  /** Quiet adaptive note from Smart Dashboard emphasis — never a new card. */
  emphasisNote?: string | null;
}) {
  const { formatEur, convertToEur, convertEur, baseCurrency } =
    useBaseCurrencyDisplay();
  const { goal, hasSavedGoal } = useUserGoal();
  const [isExporting, setIsExporting] = useState(false);

  const contributionHoldings = useMemo(
    () =>
      holdings.map((holding) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
      })),
    [holdings],
  );

  const { entries, summary } = usePortfolioContributions(
    portfolioValue,
    portfolioValueAvailable,
    holdings.length > 0,
    contributionHoldings,
  );

  const { snapshot: cashSnapshot } = useCashIntelligence(
    holdings,
    holdings.length > 0,
  );

  const exposure = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const { valuedPositions, unvaluedHoldings } = useMemo(
    () => buildValuedPositions(holdings),
    [holdings],
  );

  const timeline = useMemo(
    () =>
      buildPortfolioTimeline({
        entries,
        contributionSummary: summary,
        chartPoints: history?.chartPoints ?? null,
        currentPortfolioValue: portfolioValueAvailable ? portfolioValue : null,
        portfolioValueAvailable,
        startingPortfolioValue: history?.startingValue ?? null,
        endingPortfolioValue: history?.endingValue ?? null,
        investmentReturn: history?.investmentReturn ?? null,
        investmentReturnPercent: history?.investmentReturnPercent ?? null,
        periodLabel: history ? "1 month" : null,
      }),
    [
      entries,
      history,
      portfolioValue,
      portfolioValueAvailable,
      summary,
    ],
  );

  const keyStatisticValue = formatContributionBaseAmount(
    timeline.summary.netContributions,
    formatEur,
    convertToEur,
  );

  function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const holdingsRows = mapHoldingsForHistoryExport(
        holdings,
        valuedPositions.map((position) => ({
          ...position,
          value: convertEur(position.value) ?? position.value,
        })),
        unvaluedHoldings,
      );
      const weeklyReview = buildCompanionReview("weekly", {
        holdingCount: holdings.length,
        formatMoney: formatEur,
        weekSeries: history?.chartPoints ?? timeline.chartPoints,
        contributionEntries: entries,
        hasSavedGoal,
      });
      const input = {
        summary,
        entries,
        holdings: holdingsRows,
        portfolioBaseCurrency: baseCurrency,
        portfolioValueAvailable,
        timelineSummary: timeline.summary,
        exposure,
        cash: cashSnapshot,
        goals:
          hasSavedGoal && goal
            ? { goal, hasSavedGoal }
            : null,
        review: weeklyReview.ready ? weeklyReview : null,
      };
      if (!canExportPortfolio(input)) {
        return;
      }
      downloadPortfolioWorkbook(input);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <PortfolioHistoryNavCard
      chartPoints={timeline.chartPoints}
      hasSeries={timeline.hasValueSeries}
      keyStatisticLabel="Net contributions"
      keyStatisticValue={keyStatisticValue}
      onExportPortfolio={handleExport}
      isExporting={isExporting}
      emphasisNote={emphasisNote}
    />
  );
}
