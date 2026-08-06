/**
 * Period cash-flow helpers — reuse contribution ledger only.
 */

import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type PeriodFlowTotals = {
  contributed: number;
  withdrawn: number;
  netContributions: number;
  hasFlowData: boolean;
};

export function sumFlowsInRange(
  entries: PortfolioContributionEntry[] | null | undefined,
  startDate: string,
  endDate: string,
): PeriodFlowTotals {
  let contributed = 0;
  let withdrawn = 0;

  for (const entry of entries ?? []) {
    if (entry.entryDate < startDate || entry.entryDate > endDate) continue;
    if (!Number.isFinite(entry.baseAmount) || entry.baseAmount <= 0) continue;
    if (entry.entryType === "contribution") {
      contributed += entry.baseAmount;
    } else if (entry.entryType === "withdrawal") {
      withdrawn += entry.baseAmount;
    }
  }

  return {
    contributed,
    withdrawn,
    netContributions: contributed - withdrawn,
    hasFlowData: contributed > 0 || withdrawn > 0,
  };
}

export function filterSeriesToRange(
  points: PortfolioPerformancePoint[] | null | undefined,
  startDate: string,
  endDate: string,
): PortfolioPerformancePoint[] {
  return (points ?? [])
    .filter((point) => point.date >= startDate && point.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Investment return for a period ≈ value change − net contributions in range.
 * Returns null when opening/closing values are missing.
 */
export function estimatePeriodInvestmentReturn(input: {
  startingValue: number | null;
  endingValue: number | null;
  netContributions: number;
  hasFlowData: boolean;
}): { investmentReturn: number | null; portfolioMovement: number | null } {
  if (
    input.startingValue == null ||
    input.endingValue == null ||
    !Number.isFinite(input.startingValue) ||
    !Number.isFinite(input.endingValue)
  ) {
    return { investmentReturn: null, portfolioMovement: null };
  }

  const portfolioMovement = input.endingValue - input.startingValue;
  if (!input.hasFlowData) {
    // Without flows, movement is the best available figure — do not claim "investment return".
    return { investmentReturn: null, portfolioMovement };
  }

  return {
    investmentReturn: portfolioMovement - input.netContributions,
    portfolioMovement,
  };
}

export function sumDividendAmountInRange(
  payments:
    | Array<{ paymentDate: string; amountBase?: number | null }>
    | null
    | undefined,
  startDate: string,
  endDate: string,
): number | null {
  let total = 0;
  let found = false;
  for (const payment of payments ?? []) {
    const date = payment.paymentDate?.trim();
    if (!date || date < startDate || date > endDate) continue;
    if (payment.amountBase == null || !Number.isFinite(payment.amountBase)) {
      continue;
    }
    total += payment.amountBase;
    found = true;
  }
  return found ? total : null;
}
