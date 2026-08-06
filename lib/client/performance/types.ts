/**
 * Portfolio performance types for the Analysis page.
 *
 * Calculation method: contribution_adjusted_simple_return
 * (not time-weighted — cash-flow timing is not reliably available client-side).
 */

export type PerformancePeriodId =
  | "1D"
  | "1W"
  | "1M"
  | "YTD"
  | "1Y"
  | "ALL";

export type PerformanceCalculationMethod =
  | "contribution_adjusted_simple_return"
  | "unavailable";

export type PerformanceDataAvailability =
  | "full"
  | "partial"
  | "summary_only"
  | "unavailable";

export type PortfolioPerformancePoint = {
  date: string;
  portfolioValue: number;
  /** Cumulative net contributions at this date when known; otherwise null. */
  netContributions: number | null;
  /** Investment return (gain/loss excluding flows) when computable. */
  investmentReturn: number | null;
};

export type PerformanceHoldingLeader = {
  holdingId: string;
  symbol: string;
  name: string;
  returnPercent: number | null;
  returnAmount: number | null;
  periodContributionEur: number | null;
  dataComplete: boolean;
};

export type PortfolioPerformanceResult = {
  period: PerformancePeriodId;
  periodLabel: string;
  calculationMethod: PerformanceCalculationMethod;
  dataAvailability: PerformanceDataAvailability;
  /** Human-readable explanation when history or flows are incomplete. */
  availabilityMessage: string | null;
  currentPortfolioValue: number;
  startingPortfolioValue: number | null;
  endingPortfolioValue: number | null;
  netContributions: number | null;
  investmentReturn: number | null;
  investmentReturnPercent: number | null;
  lastUpdatedAt: string | null;
  chartPoints: PortfolioPerformancePoint[];
  chartHasSeries: boolean;
  bestHolding: PerformanceHoldingLeader | null;
  worstHolding: PerformanceHoldingLeader | null;
  holdingLeadersAvailable: boolean;
};

export const PERFORMANCE_PERIODS: Array<{
  id: PerformancePeriodId;
  label: string;
  shortLabel: string;
}> = [
  { id: "1D", label: "1 day", shortLabel: "1D" },
  { id: "1W", label: "1 week", shortLabel: "1W" },
  { id: "1M", label: "1 month", shortLabel: "1M" },
  { id: "YTD", label: "Year to date", shortLabel: "YTD" },
  { id: "1Y", label: "1 year", shortLabel: "1Y" },
  { id: "ALL", label: "All time", shortLabel: "All" },
];
