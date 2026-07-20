"use client";

import Link from "next/link";
import { Target, TrendingDown, TrendingUp } from "lucide-react";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import type { DashboardSummary } from "@/lib/client/dashboardSummary";

function signedCurrency(value: number) {
  const formatted = formatPortfolioCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

export function DashboardHero({ summary }: { summary: DashboardSummary }) {
  const todayTone =
    summary.todayChange >= 0 ? "text-emerald-300" : "text-red-300";
  const totalTone =
    summary.totalReturn >= 0 ? "text-emerald-300" : "text-red-300";
  const showTodayMove =
    summary.hasDailyData && summary.performanceCoverageComplete;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 text-white shadow-2xl sm:rounded-[32px]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-8 sm:py-7">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Portfolio overview
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-400">
          Total portfolio value
        </p>
        <p className="mt-1 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
          {formatPortfolioCurrency(summary.portfolioValue)}
        </p>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Last portfolio update: {formatMarketUpdateTime(summary.lastUpdatedAt)}
        </p>
        {summary.dailyPerformanceCoverageMessage ? (
          <p className="mt-3 text-xs font-medium text-slate-400">
            {summary.dailyPerformanceCoverageMessage}
          </p>
        ) : null}
      </div>

      <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <HeroMetric
          label="Today's move"
          value={
            showTodayMove
              ? signedCurrency(summary.todayChange)
              : summary.hasDailyData
                ? "Partial data"
                : "Awaiting data"
          }
          detail={
            showTodayMove
              ? signedPercent(summary.todayPercent)
              : summary.dailyPerformanceCoverageMessage ??
                "Previous-close prices required"
          }
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
    <div className="bg-slate-950 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className={`mt-3 text-2xl font-black tracking-[-0.04em] ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p>
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
  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50/60"
      : "border-red-200 bg-red-50/60";

  const emptyMessage = !performanceCoverageComplete
    ? tone === "positive"
      ? "Insufficient daily performance data to determine the biggest winner."
      : "Insufficient daily performance data to determine the biggest loser."
    : `No ${tone === "positive" ? "positive" : "negative"} mover today based on available price data.`;

  return (
    <article className={`rounded-[24px] border p-5 ${toneClasses}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      {mover ? (
        <>
          <Link
            href={`/portfolio/${mover.symbol.toLowerCase()}`}
            className="mt-3 block rounded-xl transition hover:bg-white/60"
          >
            <p className="truncate text-lg font-black text-slate-950">{mover.name}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{mover.symbol}</p>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tone === "positive" ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <p className="text-sm font-black text-slate-950">
              {signedPercent(mover.changePercent)}
              <span aria-hidden="true"> · </span>
              {signedCurrency(mover.changeAmount)}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-600">{emptyMessage}</p>
      )}
    </article>
  );
}
