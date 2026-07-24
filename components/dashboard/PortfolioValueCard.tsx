import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import { formatSignedPortfolioPercent } from "@/lib/client/portfolioMovementFormat";
import {
  appDashboardDarkBodyMediumClass,
  appDashboardDarkMetaClass,
  appDashboardDarkMutedClass,
  appDisplayClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function sinceInceptionToneClass(
  snapshot: DashboardPortfolioSnapshot,
): string {
  if (!snapshot.canShowPerformance) {
    return "text-white/85";
  }

  if (snapshot.totalReturnPercent > 0) {
    return "text-emerald-300";
  }

  if (snapshot.totalReturnPercent < 0) {
    return "text-red-300";
  }

  return "text-white/85";
}

function sinceInceptionLabel(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.canShowPerformance) {
    return "Return unavailable";
  }

  return `${formatSignedPortfolioPercent(snapshot.totalReturnPercent)} since inception`;
}

export function PortfolioValueCard({
  snapshot,
  embedded = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  embedded?: boolean;
}) {
  const showBreakdown =
    snapshot.cashValue > 0 && snapshot.investedAssetsValue > 0;

  return (
    <article
      className={
        embedded
          ? "min-w-0 px-5 py-7 text-white sm:px-7 sm:py-8 md:px-8 md:py-9"
          : "min-w-0 rounded-[24px] border border-slate-800/90 bg-slate-950 px-5 py-7 text-white shadow-[0_16px_48px_rgba(15,23,42,0.28)] md:rounded-[28px] md:px-8 md:py-9"
      }
    >
      <p className={appHeroMetricLabelClass}>Portfolio value</p>
      <p className={`mt-3 ${appDisplayClass}`}>
        {formatPortfolioCurrency(snapshot.portfolioValue)}
      </p>
      <p
        className={`mt-3 ${appDashboardDarkBodyMediumClass} ${sinceInceptionToneClass(snapshot)}`}
      >
        {sinceInceptionLabel(snapshot)}
      </p>
      {showBreakdown ? (
        <p className={`mt-4 ${appDashboardDarkMutedClass}`}>
          Invested {formatPortfolioCurrency(snapshot.investedAssetsValue)}
          {" · "}
          Cash {formatPortfolioCurrency(snapshot.cashValue)}
        </p>
      ) : null}
      <p className={`mt-4 ${appDashboardDarkMetaClass}`}>
        {snapshot.isStale ? "Stale prices · " : null}
        Updated {formatMarketUpdateTime(snapshot.lastUpdatedAt)}
      </p>
    </article>
  );
}
