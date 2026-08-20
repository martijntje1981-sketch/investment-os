"use client";

import { useMemo, useState } from "react";

import { ManageContributionsDialog } from "@/components/contributions/ManageContributionsDialog";
import { PortfolioHistoryNavCard } from "@/components/portfolioHistory/PortfolioHistoryNavCard";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  CONTRIBUTIONS_EXPORT_SCOPE_COPY,
  CONTRIBUTIONS_INCOMPLETE_BASIS_COPY,
  CONTRIBUTIONS_ONBOARDING_COPY,
  CONTRIBUTIONS_RECORDED_LABEL,
} from "@/lib/client/contributionsCopy";
import {
  formatContributionBaseAmount,
  formatContributionEntryDate,
} from "@/lib/client/contributionsFormat";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { useUserGoal } from "@/lib/client/useUserGoal";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import { summarizeRecordedContributionDates } from "@/lib/services/contributions/calculateContributionSummary";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function recordedContributionMeta(input: {
  count: number;
  earliestDate: string | null;
  latestDate: string | null;
}): string | null {
  if (input.count <= 0) return null;

  const countLabel =
    input.count === 1
      ? "1 recorded contribution"
      : `${input.count} recorded contributions`;

  if (!input.earliestDate) return countLabel;

  const earliest = formatContributionEntryDate(input.earliestDate);
  if (!input.latestDate || input.latestDate === input.earliestDate) {
    return `${countLabel} · ${earliest}`;
  }

  return `${countLabel} · ${earliest} – ${formatContributionEntryDate(input.latestDate)}`;
}

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
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const {
    entries,
    summary,
    isMutating,
    mutationError,
    saveEntry,
    removeEntry,
    hasEntries,
  } = usePortfolioContributions(
    portfolioValue,
    portfolioValueAvailable,
    holdings.length > 0,
    contributionHoldings,
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

  const recordedDates = useMemo(
    () => summarizeRecordedContributionDates(entries, baseCurrency),
    [baseCurrency, entries],
  );

  const keyStatisticValue = hasEntries
    ? formatContributionBaseAmount(
        timeline.summary.netContributions,
        formatEur,
        convertToEur,
      )
    : null;

  const incompleteNote = hasEntries && !summary.contributionBasisReliable
    ? CONTRIBUTIONS_INCOMPLETE_BASIS_COPY
    : !hasEntries
      ? CONTRIBUTIONS_ONBOARDING_COPY
      : null;

  function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      runPortfolioExport({
        holdings,
        entries,
        portfolioValueEur: portfolioValue,
        portfolioValueAvailable,
        baseCurrency,
        convertEur,
        chartPoints: history?.chartPoints ?? null,
        goal,
        hasSavedGoal,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <PortfolioHistoryNavCard
        chartPoints={timeline.chartPoints}
        hasSeries={timeline.hasValueSeries}
        keyStatisticLabel={CONTRIBUTIONS_RECORDED_LABEL}
        keyStatisticValue={keyStatisticValue}
        supportingMeta={recordedContributionMeta(recordedDates)}
        incompleteNote={incompleteNote}
        exportDisclaimer={CONTRIBUTIONS_EXPORT_SCOPE_COPY}
        onAddContribution={() => setDialogOpen(true)}
        onExportPortfolio={handleExport}
        isExporting={isExporting}
        emphasisNote={emphasisNote}
      />

      {dialogOpen ? (
        <ManageContributionsDialog
          entries={entries}
          summary={summary}
          holdings={contributionHoldings}
          isMutating={isMutating}
          mutationError={mutationError}
          portfolioValueAvailable={portfolioValueAvailable}
          onClose={() => setDialogOpen(false)}
          onSave={saveEntry}
          onDelete={removeEntry}
        />
      ) : null}
    </>
  );
}
