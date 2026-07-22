"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { formatEuro, formatPercent } from "@/lib/home-data";
import {
  formatMarketUpdateTime,
  getMarketStatuses,
} from "@/lib/client/marketStatus";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
  RANKING_AFTER_CLOSE,
} from "@/lib/client/investorOverviewCopy";

type Holding = {
  name: string;
  change: number;
};

type PortfolioSnapshotProps = {
  totalValue: number;
  todayChange: number;
  todayPercent: number;
  hasDailyData?: boolean;
  performanceCoverageComplete?: boolean;
  dailyPerformanceCoverageMessage?: string | null;
  bestHolding: Holding;
  worstHolding: Holding;
  lastUpdatedAt?: string | null;
  isRefreshing?: boolean;
  intelligenceSummary?: ReactNode;
};

function getPerformanceColor(value: number) {
  if (value > 0) {
    return "text-[#16A34A]";
  }

  if (value < 0) {
    return "text-[#DC2626]";
  }

  return "text-[#64748B]";
}

function MarketStatusCard({
  lastUpdatedAt,
  isRefreshing,
}: {
  lastUpdatedAt?: string | null;
  isRefreshing: boolean;
}) {
  const statuses = getMarketStatuses();

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">Market status</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-emerald-800">
              {isRefreshing ? "Updating" : "Live data"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Indicative trading hours</p>
        </div>

        <div className="grid min-w-0 w-full gap-3 sm:grid-cols-3">
          {statuses.map((market) => {
            const isOpen =
              market.status === "open" ||
              market.status === "always-open";

            return (
              <div
                key={market.label}
                className="flex min-w-0 items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{market.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-950">
                    {market.statusLabel}
                  </p>
                </div>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isOpen ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-sm text-slate-500">
          Last price update:{" "}
          <span className="font-medium text-slate-950">
            {isRefreshing
              ? "Refreshing…"
              : formatMarketUpdateTime(lastUpdatedAt)}
          </span>
        </p>
      </div>
    </Card>
  );
}

function MoverRow({
  label,
  name,
  change,
  showMover,
}: {
  label: string;
  name: string;
  change: number;
  showMover: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-base font-semibold text-slate-950">
          {showMover ? name : RANKING_AFTER_CLOSE}
        </p>
      </div>
      {showMover ? (
        <p className={`shrink-0 text-base font-semibold ${getPerformanceColor(change)}`}>
          {formatPercent(change, true)}
        </p>
      ) : null}
    </div>
  );
}

export function PortfolioSnapshot({
  totalValue,
  todayChange,
  todayPercent,
  hasDailyData = true,
  performanceCoverageComplete = true,
  dailyPerformanceCoverageMessage = null,
  bestHolding,
  worstHolding,
  lastUpdatedAt,
  isRefreshing = false,
  intelligenceSummary,
}: PortfolioSnapshotProps) {
  const showTodayMove = hasDailyData && performanceCoverageComplete;
  const showMovers = performanceCoverageComplete;

  const todayValue = formatTodayMoveValue({
    hasDailyData,
    performanceCoverageComplete,
    formatValue: () => formatEuro(todayChange, { signed: true }),
  });

  const todayPercentValue = formatTodayMoveValue({
    hasDailyData,
    performanceCoverageComplete,
    formatValue: () => formatPercent(todayPercent, true),
  });

  const todayDetail = formatTodayMoveDetail({
    hasDailyData,
    performanceCoverageComplete,
    formatPercent: () => formatPercent(todayPercent, true),
    coverageMessage: dailyPerformanceCoverageMessage,
  });

  return (
    <section className="min-w-0 space-y-4">
      <Card className="min-w-0 overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Total portfolio value
          </p>
          <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
            {formatEuro(totalValue)}
          </p>
        </div>

        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <div className="min-w-0 bg-white px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Today&apos;s change
            </p>
            <p
              className={`mt-1 text-2xl font-black tracking-[-0.03em] ${
                showTodayMove ? getPerformanceColor(todayChange) : "text-slate-500"
              }`}
            >
              {todayValue}
            </p>
            {!showTodayMove ? (
              <p className="mt-1 text-base text-slate-500">{todayDetail}</p>
            ) : null}
          </div>
          <div className="min-w-0 bg-white px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Today&apos;s %
            </p>
            <p
              className={`mt-1 text-2xl font-black tracking-[-0.03em] ${
                showTodayMove ? getPerformanceColor(todayPercent) : "text-slate-500"
              }`}
            >
              {todayPercentValue}
            </p>
            <p className="mt-1 text-base text-slate-500">
              {showTodayMove ? "Compared with previous close" : todayDetail}
            </p>
          </div>
        </div>

        {intelligenceSummary ? (
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            {intelligenceSummary}
          </div>
        ) : null}

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Best & worst today
          </p>
          <div className="mt-3 space-y-2">
            <MoverRow
              label="Best"
              name={bestHolding.name}
              change={bestHolding.change}
              showMover={showMovers}
            />
            <MoverRow
              label="Worst"
              name={worstHolding.name}
              change={worstHolding.change}
              showMover={showMovers}
            />
          </div>
        </div>
      </Card>

      <MarketStatusCard
        lastUpdatedAt={lastUpdatedAt}
        isRefreshing={isRefreshing}
      />
    </section>
  );
}
