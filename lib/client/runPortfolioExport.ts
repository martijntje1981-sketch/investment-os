/**
 * Shared one-click Export Portfolio runner — one workbook builder only.
 * Always includes the canonical contribution ledger when the caller supplies it.
 */

import {
  canExportPortfolio,
  downloadPortfolioWorkbook,
  type PortfolioExportInput,
} from "@/lib/client/portfolioExport";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import { buildPortfolioFundingHistory } from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
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
  currentProgressPercent?: number | null;
  remainingAmount?: number | null;
  statusLabel?: string | null;
};

export function runPortfolioExport(input: RunPortfolioExportInput): boolean {
  const currentBase =
    input.portfolioValueAvailable && input.portfolioValueEur != null
      ? input.convertEur(input.portfolioValueEur)
      : null;

  const summary = calculateContributionSummary(
    input.entries,
    currentBase,
    input.baseCurrency,
  );
  const fundingHistory = buildPortfolioFundingHistory({
    entries: input.entries,
    currentPortfolioValueBase: currentBase,
    portfolioBaseCurrency: input.baseCurrency,
  });

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
    holdings: input.holdings,
    entries: input.entries,
    portfolioBaseCurrency: input.baseCurrency,
    portfolioValueAvailable: input.portfolioValueAvailable,
    timeline,
    fundingHistory,
    convertEur: input.convertEur,
    goals:
      input.hasSavedGoal && input.goal
        ? {
            goal: input.goal,
            hasSavedGoal: true,
            currentProgressPercent: input.currentProgressPercent,
            remainingAmount: input.remainingAmount,
            statusLabel: input.statusLabel,
          }
        : null,
  };

  if (!canExportPortfolio(exportInput)) return false;
  downloadPortfolioWorkbook(exportInput);
  return true;
}
