import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
} from "@/lib/client/investorOverviewCopy";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function todayToneClass(
  snapshot: DashboardPortfolioSnapshot,
  embedded: boolean,
): string {
  if (!snapshot.hasDailyData || !snapshot.performanceCoverageComplete) {
    return embedded ? "text-slate-200" : "text-slate-700";
  }

  if (snapshot.todayChange > 0) {
    return embedded ? "text-emerald-300" : "text-emerald-700";
  }

  if (snapshot.todayChange < 0) {
    return embedded ? "text-red-300" : "text-red-700";
  }

  return embedded ? "text-slate-200" : "text-slate-700";
}

export function TodayCard({
  snapshot,
  embedded = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  embedded?: boolean;
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

  const unavailableCopy =
    amountLabel === "—" ? "Change unavailable" : amountLabel;

  return (
    <article
      className={
        embedded
          ? "min-w-0 border-t border-white/10 px-4 py-5 text-white sm:px-6 sm:py-6 md:border-t-0 md:border-l"
          : "min-w-0 rounded-[24px] border border-slate-200/80 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] md:px-6 md:py-6"
      }
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
          embedded ? "text-slate-400" : "text-slate-500"
        }`}
      >
        Today
      </p>
      <p
        className={`mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] sm:text-[2.25rem] ${todayToneClass(snapshot, embedded)}`}
      >
        {showTodayMove ? amountLabel : unavailableCopy}
      </p>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          embedded ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {showTodayMove
          ? percentLabel
          : percentLabel === "—"
            ? "Change unavailable"
            : percentLabel}
      </p>
    </article>
  );
}
