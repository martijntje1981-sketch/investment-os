import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import {
  formatTodayMoveDetail,
  formatTodayMoveValue,
} from "@/lib/client/investorOverviewCopy";
import {
  appHeroKpiClass,
  appHeroMetricLabelClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
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
          ? "min-w-0 border-t border-white/[0.08] px-5 py-6 text-white sm:px-6 sm:py-7 md:border-t-0 md:border-l"
          : "min-w-0 rounded-[24px] border border-slate-200/80 bg-white px-5 py-6 shadow-sm md:px-6 md:py-7"
      }
    >
      <p className={embedded ? appHeroMetricLabelClass : appSectionLabelClass}>
        Today
      </p>
      <p
        className={`mt-2.5 ${appHeroKpiClass} ${todayToneClass(snapshot, embedded)}`}
      >
        {showTodayMove ? amountLabel : unavailableCopy}
      </p>
      <p
        className={`mt-2.5 ${appSectionMetaClass} ${
          embedded ? "text-slate-300" : "text-slate-600"
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
