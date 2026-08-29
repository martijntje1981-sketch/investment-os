/**
 * Compose a Portfolio Timeline from existing performance series + contribution ledger.
 * Does not invent chart points or cash-flow rows.
 */

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import { activityTypeLabel } from "@/lib/services/contributions/activityLabels";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type {
  PortfolioTimeline,
  PortfolioTimelineDividendPayment,
  PortfolioTimelineEvent,
  PortfolioTimelineSummary,
  PortfolioTimelineValuePoint,
} from "@/lib/services/portfolio/timeline/types";

export type BuildPortfolioTimelineInput = {
  entries: PortfolioContributionEntry[];
  contributionSummary: ContributionSummary;
  /** Existing performance chart points — never fabricated here. */
  chartPoints?: PortfolioPerformancePoint[] | null;
  currentPortfolioValue: number | null;
  portfolioValueAvailable: boolean;
  startingPortfolioValue?: number | null;
  endingPortfolioValue?: number | null;
  investmentReturn?: number | null;
  investmentReturnPercent?: number | null;
  periodLabel?: string | null;
  dividendPayments?: PortfolioTimelineDividendPayment[] | null;
};

function cumulativeNetByDate(
  entries: PortfolioContributionEntry[],
): Map<string, number> {
  const chronological = [...entries].sort((left, right) => {
    const byDate = left.entryDate.localeCompare(right.entryDate);
    if (byDate !== 0) return byDate;
    return left.createdAt.localeCompare(right.createdAt);
  });

  const map = new Map<string, number>();
  let running = 0;
  for (const entry of chronological) {
    running +=
      entry.entryType === "withdrawal" ? -entry.baseAmount : entry.baseAmount;
    map.set(entry.entryDate, running);
  }
  return map;
}

function resolveNetAtDate(
  cumulativeByDate: Map<string, number>,
  date: string,
): number | null {
  if (cumulativeByDate.size === 0) return null;
  let latest: number | null = null;
  for (const [entryDate, value] of cumulativeByDate) {
    if (entryDate <= date) {
      latest = value;
    }
  }
  return latest;
}

function buildEvents(
  entries: PortfolioContributionEntry[],
  dividendPayments: PortfolioTimelineDividendPayment[] | null | undefined,
): PortfolioTimelineEvent[] {
  const events: PortfolioTimelineEvent[] = [];

  for (const entry of entries) {
    const isWithdrawal = entry.entryType === "withdrawal";
    events.push({
      id: `contribution:${entry.id}`,
      kind: isWithdrawal ? "withdrawal" : "contribution",
      date: entry.entryDate,
      title: activityTypeLabel(entry),
      amount: isWithdrawal ? -entry.baseAmount : entry.baseAmount,
      note: entry.note,
      sortKey: entry.createdAt || entry.entryDate,
      meta: {
        destinationType: entry.destinationType,
        holdingSymbol: entry.destinationHoldingSymbol,
        source: entry.source,
      },
    });
  }

  for (const payment of dividendPayments ?? []) {
    const date = payment.paymentDate?.trim();
    if (!date) continue;
    events.push({
      id: `dividend:${payment.id}`,
      kind: "dividend",
      date,
      title:
        payment.title?.trim() ||
        (payment.holdingSymbol
          ? `Dividend · ${payment.holdingSymbol}`
          : "Dividend"),
      amount:
        payment.amountBase != null && Number.isFinite(payment.amountBase)
          ? payment.amountBase
          : null,
      note: null,
      sortKey: `${date}T12:00:00.000Z`,
      meta: {
        holdingSymbol: payment.holdingSymbol ?? null,
      },
    });
  }

  if (entries.length > 0) {
    const first = [...entries].sort((a, b) =>
      a.entryDate.localeCompare(b.entryDate),
    )[0];
    if (first) {
      events.push({
        id: `milestone:first-activity:${first.id}`,
        kind: "milestone",
        date: first.entryDate,
        title: "Portfolio history started",
        amount: null,
        note: null,
        sortKey: `${first.entryDate}T00:00:00.000Z`,
      });
    }
  }

  return events.sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);
    if (byDate !== 0) return byDate;
    return right.sortKey.localeCompare(left.sortKey);
  });
}

function buildValueSeries(
  chartPoints: PortfolioPerformancePoint[] | null | undefined,
  entries: PortfolioContributionEntry[],
): PortfolioTimelineValuePoint[] {
  if (!chartPoints || chartPoints.length === 0) return [];
  const cumulative = cumulativeNetByDate(entries);

  return chartPoints.map((point) => {
    const fromSeries =
      point.netContributions != null && Number.isFinite(point.netContributions)
        ? point.netContributions
        : resolveNetAtDate(cumulative, point.date);

    return {
      date: point.date,
      portfolioValue: point.portfolioValue,
      netContributions: fromSeries,
      investmentReturn:
        point.investmentReturn != null && Number.isFinite(point.investmentReturn)
          ? point.investmentReturn
          : fromSeries != null
            ? point.portfolioValue - fromSeries
            : null,
    };
  });
}

function buildSummary(
  input: BuildPortfolioTimelineInput,
  valueSeries: PortfolioTimelineValuePoint[],
): PortfolioTimelineSummary {
  const starting =
    input.startingPortfolioValue ??
    (valueSeries.length > 0 ? valueSeries[0]!.portfolioValue : null);
  const ending =
    input.endingPortfolioValue ??
    (valueSeries.length > 0
      ? valueSeries[valueSeries.length - 1]!.portfolioValue
      : input.currentPortfolioValue);

  const portfolioGrowth =
    starting != null && ending != null ? ending - starting : null;
  const portfolioGrowthPercent =
    portfolioGrowth != null && starting != null && starting !== 0
      ? (portfolioGrowth / starting) * 100
      : null;

  const investmentReturn =
    input.investmentReturn != null
      ? input.investmentReturn
      : input.contributionSummary.valueAboveContributions;

  const investmentReturnPercent =
    input.investmentReturnPercent != null
      ? input.investmentReturnPercent
      : input.contributionSummary.valueAboveContributionsPercent;

  return {
    currentPortfolioValue: input.portfolioValueAvailable
      ? input.currentPortfolioValue
      : null,
    portfolioValueAvailable: input.portfolioValueAvailable,
    netContributions: input.contributionSummary.netContributed,
    totalContributed: input.contributionSummary.totalContributed,
    totalWithdrawn: input.contributionSummary.totalWithdrawn,
    portfolioGrowth,
    portfolioGrowthPercent,
    investmentReturn,
    investmentReturnPercent,
    startingPortfolioValue: starting,
    endingPortfolioValue: ending,
    periodLabel: input.periodLabel ?? null,
    contributionSummary: input.contributionSummary,
  };
}

/**
 * Build the shared Portfolio Timeline model.
 */
export function buildPortfolioTimeline(
  input: BuildPortfolioTimelineInput,
): PortfolioTimeline {
  const valueSeries = buildValueSeries(input.chartPoints, input.entries);
  const events = buildEvents(input.entries, input.dividendPayments);
  const summary = buildSummary(input, valueSeries);

  const chartPoints: PortfolioPerformancePoint[] = valueSeries.map((point) => ({
    date: point.date,
    portfolioValue: point.portfolioValue,
    netContributions: point.netContributions,
    investmentReturn: point.investmentReturn,
  }));

  return {
    valueSeries,
    events,
    summary,
    hasValueSeries: valueSeries.length >= 2,
    hasEvents: events.length > 0,
    chartPoints,
  };
}

/** Adapter for Goals `portfolioHistory` input — reuses timeline value series. */
export function timelineToGoalHistoryPoints(
  timeline: PortfolioTimeline,
): Array<{ date: string; value: number }> {
  return timeline.valueSeries.map((point) => ({
    date: point.date,
    value: point.portfolioValue,
  }));
}
