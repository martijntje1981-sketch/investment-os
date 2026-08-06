/**
 * Shared one-click Export Portfolio runner — one workbook builder only.
 */

import {
  canExportPortfolio,
  downloadPortfolioWorkbook,
  mapHoldingsForHistoryExport,
  type PortfolioExportInput,
} from "@/lib/client/portfolioExport";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { CompanionReview } from "@/lib/services/portfolio/companion";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type RunPortfolioExportInput = {
  holdings: StoredPortfolioHolding[];
  entries: PortfolioContributionEntry[];
  portfolioValueEur: number | null;
  portfolioValueAvailable: boolean;
  baseCurrency: PortfolioBaseCurrency;
  convertEur: (value: number) => number | null;
  chartPoints?: PortfolioPerformancePoint[] | null;
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
  review?: CompanionReview | null;
};

export function runPortfolioExport(input: RunPortfolioExportInput): boolean {
  const { valuedPositions, unvaluedHoldings } = buildValuedPositions(
    input.holdings,
  );
  const holdingsRows = mapHoldingsForHistoryExport(
    input.holdings,
    valuedPositions.map((position) => ({
      ...position,
      value: input.convertEur(position.value) ?? position.value,
    })),
    unvaluedHoldings,
  );

  const currentBase =
    input.portfolioValueAvailable && input.portfolioValueEur != null
      ? input.convertEur(input.portfolioValueEur)
      : null;

  const summary = calculateContributionSummary(
    input.entries,
    currentBase,
    input.baseCurrency,
  );

  const timeline = buildPortfolioTimeline({
    entries: input.entries,
    contributionSummary: summary,
    chartPoints: input.chartPoints ?? [],
    currentPortfolioValue: input.portfolioValueAvailable
      ? input.portfolioValueEur
      : null,
    portfolioValueAvailable: input.portfolioValueAvailable,
  });

  const exportInput: PortfolioExportInput = {
    summary,
    entries: input.entries,
    holdings: holdingsRows,
    portfolioBaseCurrency: input.baseCurrency,
    portfolioValueAvailable: input.portfolioValueAvailable,
    timelineSummary: timeline.summary,
    goals:
      input.hasSavedGoal && input.goal
        ? { goal: input.goal, hasSavedGoal: true }
        : null,
    review: input.review?.ready ? input.review : null,
  };

  if (!canExportPortfolio(exportInput)) return false;
  downloadPortfolioWorkbook(exportInput);
  return true;
}
