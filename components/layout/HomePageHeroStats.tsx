"use client";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
} from "@/lib/client/investorOverviewCopy";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

type HomeSummary = {
  totalValue: number;
  totalValueAvailable?: boolean;
  totalValueCoverageMessage?: string | null;
  todayChange: number;
  todayPercent: number;
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  dailyPerformanceCoverageMessage: string | null;
  dailyMoveHeroLabel: string;
  dailyMovePeriodDetail: string | null;
  latestUpdatedAt: string | null;
};

function HeroStat({
  label,
  value,
  detail,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-brand/20 bg-white/80 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-q1-strong">
        {label}
      </p>
      <p className={`mt-1 truncate text-base font-black sm:text-lg ${valueClassName}`}>
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-xs text-slate-600">{detail}</p>
      ) : null}
    </div>
  );
}

export function HomePageHeroStats({
  summary,
  goalProgress,
  hasSavedGoal,
}: {
  summary: HomeSummary;
  goalProgress: GoalProgress;
  hasSavedGoal: boolean;
}) {
  const { formatEur } = useBaseCurrencyDisplay();

  const todayValue = formatTodayMoveValue({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatValue: () =>
      formatSignedPortfolioCurrency(summary.todayChange, formatEur),
  });

  const todayDetail = formatTodayMoveDetail({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatPercent: () => formatSignedPortfolioPercent(summary.todayPercent),
    coverageMessage: summary.dailyPerformanceCoverageMessage,
    mixedPeriodDetail: summary.dailyMovePeriodDetail,
  });

  const todayTone = summary.hasDailyData
    ? summary.todayChange > 0
      ? "text-emerald-600"
      : summary.todayChange < 0
        ? "text-rose-600"
        : "text-slate-700"
    : "text-slate-700";

  return (
    <div className="space-y-2">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <HeroStat
          label="Portfolio value"
          value={
            summary.totalValueAvailable === false
              ? "Unavailable"
              : formatEur(summary.totalValue)
          }
          detail={summary.totalValueCoverageMessage ?? undefined}
        />
        <HeroStat
          label={summary.dailyMoveHeroLabel}
          value={summary.hasDailyData ? todayValue : "—"}
          detail={todayDetail}
          valueClassName={todayTone}
        />
        <HeroStat
          label="Goal progress"
          value={
            hasSavedGoal && goalProgress.hasGoal
              ? formatPortfolioPercent(goalProgress.currentProgressPercent)
              : "Not set"
          }
          detail={
            hasSavedGoal && goalProgress.hasGoal
              ? formatEur(goalProgress.currentValue)
              : undefined
          }
        />
        <HeroStat
          label="Last updated"
          value={formatMarketUpdateTime(summary.latestUpdatedAt)}
        />
      </div>
      <div>
        <ConversionDetailsDisclosure compactTrigger tone="light" />
      </div>
    </div>
  );
}
