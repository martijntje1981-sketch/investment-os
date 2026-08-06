/**
 * Shared Portfolio Timeline — central history source for History, Goals,
 * Portfolio Intelligence, export, and future analytics.
 *
 * Never fabricates value points. Events come only from verified ledger /
 * optional dividend payment dates already present in the product.
 */

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { ContributionSummary } from "@/lib/services/contributions/types";

export type PortfolioTimelineEventKind =
  | "contribution"
  | "withdrawal"
  | "dividend"
  | "milestone";

export type PortfolioTimelineEvent = {
  id: string;
  kind: PortfolioTimelineEventKind;
  /** Calendar date YYYY-MM-DD */
  date: string;
  title: string;
  /** Signed base-currency amount when known (contributions +, withdrawals −). */
  amount: number | null;
  note: string | null;
  /** Stable sort key (ISO datetime or date). */
  sortKey: string;
  meta?: {
    destinationType?: "cash" | "holding" | null;
    holdingSymbol?: string | null;
    source?: string | null;
  };
};

export type PortfolioTimelineValuePoint = {
  date: string;
  portfolioValue: number;
  netContributions: number | null;
  investmentReturn: number | null;
};

export type PortfolioTimelineSummary = {
  currentPortfolioValue: number | null;
  portfolioValueAvailable: boolean;
  netContributions: number;
  totalContributed: number;
  totalWithdrawn: number;
  /** Ending − starting value of the available series (null when no series). */
  portfolioGrowth: number | null;
  portfolioGrowthPercent: number | null;
  /** Gain/loss vs net contributions when both are available. */
  investmentReturn: number | null;
  investmentReturnPercent: number | null;
  startingPortfolioValue: number | null;
  endingPortfolioValue: number | null;
  periodLabel: string | null;
  contributionSummary: ContributionSummary;
};

export type PortfolioTimeline = {
  valueSeries: PortfolioTimelineValuePoint[];
  /** Newest-first for timeline UI. */
  events: PortfolioTimelineEvent[];
  summary: PortfolioTimelineSummary;
  hasValueSeries: boolean;
  hasEvents: boolean;
  /** Chart-ready points for PortfolioPerformanceChart. */
  chartPoints: PortfolioPerformancePoint[];
};

/** Minimal dividend payment row usable as a timeline event. */
export type PortfolioTimelineDividendPayment = {
  id: string;
  paymentDate: string;
  holdingSymbol?: string | null;
  amountBase?: number | null;
  title?: string | null;
};
