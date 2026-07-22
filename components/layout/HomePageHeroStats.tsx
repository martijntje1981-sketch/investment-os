import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
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
  todayChange: number;
  todayPercent: number;
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  dailyPerformanceCoverageMessage: string | null;
  latestUpdatedAt: string | null;
};

function HeroStat({
  label,
  value,
  detail,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 truncate text-base font-black sm:text-lg ${valueClassName}`}>
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-xs text-slate-400">{detail}</p>
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
  const todayValue = formatTodayMoveValue({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatValue: () => formatSignedPortfolioCurrency(summary.todayChange),
  });

  const todayDetail = formatTodayMoveDetail({
    hasDailyData: summary.hasDailyData,
    performanceCoverageComplete: summary.performanceCoverageComplete,
    formatPercent: () => formatSignedPortfolioPercent(summary.todayPercent),
    coverageMessage: summary.dailyPerformanceCoverageMessage,
  });

  const todayTone =
    summary.hasDailyData && summary.performanceCoverageComplete
      ? summary.todayChange > 0
        ? "text-emerald-300"
        : summary.todayChange < 0
          ? "text-red-300"
          : "text-slate-300"
      : "text-slate-300";

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <HeroStat
        label="Portfolio value"
        value={formatPortfolioCurrency(summary.totalValue)}
      />
      <HeroStat
        label="Today"
        value={
          summary.hasDailyData && summary.performanceCoverageComplete
            ? todayValue
            : "—"
        }
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
            ? formatPortfolioCurrency(goalProgress.currentValue)
            : undefined
        }
      />
      <HeroStat
        label="Last updated"
        value={formatMarketUpdateTime(summary.latestUpdatedAt)}
      />
    </div>
  );
}
