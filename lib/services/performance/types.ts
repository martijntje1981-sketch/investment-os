/**
 * Server-side portfolio performance history types.
 *
 * Series method: market-price movement with constant (current) holdings.
 * netContributions are treated as null / not deducted — same
 * contribution_adjusted_simple_return method used when flows are unknown.
 */

import type {
  PerformanceDataAvailability,
  PerformancePeriodId,
  PortfolioPerformancePoint,
} from "@/lib/client/performance/types";
import type { PriceCurrency } from "@/lib/services/prices/types";
import type { HoldingPeriodMove } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";

/** Periods that require EOD history (1D stays client-side previousClose). */
export type PerformanceHistoryPeriodId = Exclude<PerformancePeriodId, "1D">;

export type EodHistoryPoint = {
  /** Calendar date YYYY-MM-DD */
  date: string;
  /** Close / adjusted close in listing currency */
  value: number;
};

export type PerformanceHistoryHoldingInput = {
  id: string;
  symbol: string;
  quantity: number;
  providerSymbol?: string | null;
  quoteCurrency?: PriceCurrency | string | null;
  assetType?: "investment" | "cash" | "crypto";
  /** Current price in portfolio EUR terms — used for cash flat value. */
  currentPrice?: number;
};

export type PerformanceHistoryGranularity = "daily" | "weekly";

export type PerformanceHistoryWindow = {
  period: PerformancePeriodId;
  startDate: Date;
  endDate: Date;
  fromIsoDate: string;
  toIsoDate: string;
  granularity: PerformanceHistoryGranularity;
  spanDays: number;
};

export type BuildHistoricalPortfolioSeriesInput = {
  holdings: PerformanceHistoryHoldingInput[];
  historyByProviderSymbol: Map<string, EodHistoryPoint[]>;
  /**
   * Listing currency → EUR multiplier (amount_listing * rate = amount_eur).
   * Current FX is acceptable; callers should set historicalFxApproximate.
   */
  fxRateToEur:
    ReadonlyMap<string, number> | Record<string, number | null | undefined>;
  window: Pick<
    PerformanceHistoryWindow,
    "startDate" | "endDate" | "granularity" | "period"
  >;
  /** When true (default), disclose that FX uses current rates. */
  historicalFxApproximate?: boolean;
};

export type HistoricalPortfolioSeriesResult = {
  period: PerformancePeriodId;
  chartPoints: PortfolioPerformancePoint[];
  startingValue: number | null;
  endingValue: number | null;
  investmentReturn: number | null;
  investmentReturnPercent: number | null;
  dataAvailability: PerformanceDataAvailability;
  availabilityMessage: string | null;
  historicalFxApproximate: boolean;
  coveredHoldingCount: number;
  skippedHoldingCount: number;
  earliestAvailableDate: string | null;
  /**
   * Per-holding start/end EUR moves for Phase 3A attribution.
   * Same constant-holdings / no-flow semantics as the portfolio series.
   */
  holdingMoves?: HoldingPeriodMove[];
};

export type PortfolioPerformanceHistoryRequest = {
  period: PerformanceHistoryPeriodId;
  holdings: PerformanceHistoryHoldingInput[];
};

export type PortfolioPerformanceHistoryApiResponse = {
  success: boolean;
  period: PerformancePeriodId;
  chartPoints: PortfolioPerformancePoint[];
  startingValue: number | null;
  endingValue: number | null;
  investmentReturn: number | null;
  investmentReturnPercent: number | null;
  dataAvailability: PerformanceDataAvailability;
  availabilityMessage: string | null;
  historicalFxApproximate: boolean;
  coveredHoldingCount: number;
  skippedHoldingCount: number;
  holdingMoves?: HoldingPeriodMove[];
  error?: string;
};
