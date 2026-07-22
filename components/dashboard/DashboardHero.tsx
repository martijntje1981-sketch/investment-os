"use client";

import Link from "next/link";
import { Target, TrendingDown, TrendingUp } from "lucide-react";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import type { DashboardSummary } from "@/lib/client/dashboardSummary";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
} from "@/lib/client/investorOverviewCopy";

function signedCurrency(value: number) {
  const formatted = formatPortfolioCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

export function DashboardPortfolioHero({ summary }: { summary: DashboardSummary }) {
  const showTodayMove =
    summary.hasDailyData && summary.performanceCoverageComplete;
  const todayTone =
    summary.todayChange >= 0 ? "text-emerald-300" : "text-red-300";
  const totalTone =
    summary.totalReturn >= 0 ? "text-emerald-300" : "text-red-300";

  const todayValue = formatTodayMoveValue({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatValue: () => signedCurrency(summary.todayChange),
  });

  const todayDetail = formatTodayMoveDetail({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatPercent: () => signedPercent(summary.todayPercent),
    coverageMessage: summary.dailyPerformanceCoverageMessage,
  });

  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 text-white shadow-2xl md:rounded-[32px]">
      <div className="px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Portfolio value
        </p>
        <p className="mt-2 text-4xl font-black tracking-[-0.05em] md:text-6xl">
          {formatPortfolioCurrency(summary.portfolioValue)}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Last update: {formatMarketUpdateTime(summary.lastUpdatedAt)}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroMetric
            label="Today's change"
            value={todayValue}
            detail={todayDetail}
            valueClassName={showTodayMove ? todayTone : "text-slate-300"}
          />
          <HeroMetric
            label="Total gain / loss"
            value={
              summary.canShowPerformance
                ? signedCurrency(summary.totalReturn)
                : "Unavailable"
            }
            detail={
              summary.canShowPerformance
                ? signedPercent(summary.totalReturnPercent)
                : summary.hasUnvaluedInvestments
                  ? "Some holdings lack price data"
                  : "Price data required"
            }
            valueClassName={
              summary.canShowPerformance ? totalTone : "text-slate-300"
            }
          />
          <HeroMetric
            label="Goal progress"
            value={
              summary.goalCompleted
                ? "Achieved"
                : summary.hasSavedGoal
                  ? formatPortfolioPercent(summary.goalProgress)
                  : "Not set"
            }
            detail={
              summary.hasSavedGoal && summary.goalTarget
                ? `Target ${formatPortfolioCurrency(summary.goalTarget)}`
                : "Set a goal to track progress"
            }
            valueClassName="text-violet-200"
            icon={<Target className="h-4 w-4" />}
          />
          <HeroMetric
            label="Holdings"
            value={String(summary.holdingCount)}
            detail={`${summary.holdingCount === 1 ? "position" : "positions"} monitored`}
            valueClassName="text-slate-100"
          />
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
  label,
  value,
  detail,
  valueClassName,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {icon}
        {label}
      </div>
      <p
        className={`mt-1 text-xl font-black tracking-[-0.03em] md:text-2xl ${valueClassName}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{detail}</p>
    </div>
  );
}

export function DashboardMoverCard({
  label,
  mover,
  tone,
  performanceCoverageComplete,
}: {
  label: string;
  mover: DashboardSummary["bestMover"];
  tone: "positive" | "negative";
  performanceCoverageComplete: boolean;
}) {
  if (!performanceCoverageComplete) {
    return (
      <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-base text-slate-500">Available after market close.</p>
      </article>
    );
  }

  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50/60"
      : "border-red-200 bg-red-50/60";

  return (
    <article className={`min-w-0 rounded-[20px] border p-4 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      {mover ? (
        <>
          <Link
            href={`/portfolio/${mover.symbol.toLowerCase()}`}
            className="mt-2 block min-w-0 rounded-xl transition hover:bg-white/60"
          >
            <p className="truncate text-lg font-black text-slate-950">{mover.name}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">{mover.symbol}</p>
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tone === "positive" ? (
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <p className="text-base font-black text-slate-950">
              {signedPercent(mover.changePercent)}
              <span aria-hidden="true"> · </span>
              {signedCurrency(mover.changeAmount)}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-base text-slate-500">
          No {tone === "positive" ? "positive" : "negative"} mover today.
        </p>
      )}
    </article>
  );
}

/** @deprecated Use DashboardPortfolioHero */
export const DashboardHero = DashboardPortfolioHero;
