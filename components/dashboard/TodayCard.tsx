import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
} from "@/lib/client/investorOverviewCopy";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function todayToneClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData || !snapshot.performanceCoverageComplete) {
    return "text-slate-600";
  }

  if (snapshot.todayChange > 0) {
    return "text-emerald-700";
  }

  if (snapshot.todayChange < 0) {
    return "text-red-700";
  }

  return "text-slate-600";
}

export function TodayCard({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
  const showTodayMove =
    snapshot.hasDailyData && snapshot.performanceCoverageComplete;

  const amountLabel = formatTodayMoveValue({
    hasDailyData: snapshot.hasDailyData,
    performanceCoverageComplete: snapshot.performanceCoverageComplete,
    formatValue: () => formatSignedPortfolioCurrency(snapshot.todayChange),
  });

  const percentLabel = formatTodayMoveDetail({
    hasDailyData: snapshot.hasDailyData,
    performanceCoverageComplete: snapshot.performanceCoverageComplete,
    formatPercent: () =>
      `${formatSignedPortfolioPercent(snapshot.todayPercent)} today`,
    coverageMessage: snapshot.dailyPerformanceCoverageMessage,
  });

  return (
    <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        Today
      </p>
      <p
        className={`mt-2 text-2xl font-black tracking-[-0.03em] ${todayToneClass(snapshot)}`}
      >
        {showTodayMove ? amountLabel : amountLabel === "—" ? "Change unavailable" : amountLabel}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {showTodayMove
          ? percentLabel
          : percentLabel === "—"
            ? "Change unavailable"
            : percentLabel}
      </p>
    </article>
  );
}
