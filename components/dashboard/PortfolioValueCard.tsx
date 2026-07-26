"use client";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import { formatAmsterdamPriceRefreshTime } from "@/lib/client/marketSnapshotSync";
import { formatSignedPortfolioPercent } from "@/lib/client/portfolioMovementFormat";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
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
  refresh,
}: {
  snapshot: DashboardPortfolioSnapshot;
  embedded?: boolean;
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
    disabled?: boolean;
    status?: RefreshPricesUiStatus;
    message?: string | null;
    liveRefreshAt?: string | null;
  };
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const showBreakdown =
    snapshot.cashValue > 0 && snapshot.investedAssetsValue > 0;

  const updatedLabel = refresh?.liveRefreshAt
    ? `Updated ${formatAmsterdamPriceRefreshTime(refresh.liveRefreshAt)}`
    : `Updated ${formatMarketUpdateTime(snapshot.lastUpdatedAt)}`;

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
        {snapshot.portfolioValueAvailable
          ? formatEur(snapshot.portfolioValue)
          : "Unavailable"}
      </p>
      <div className="mt-2">
        <ConversionDetailsDisclosure compactTrigger tone="dark" />
      </div>
      {snapshot.portfolioValueCoverageMessage ? (
        <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
          {snapshot.portfolioValueCoverageMessage}
        </p>
      ) : null}
      <p
        className={`mt-3 ${appDashboardDarkBodyMediumClass} ${sinceInceptionToneClass(snapshot)}`}
      >
        {sinceInceptionLabel(snapshot)}
      </p>
      {showBreakdown ? (
        <p className={`mt-4 ${appDashboardDarkMutedClass}`}>
          Invested {formatEur(snapshot.investedAssetsValue)}
          {" · "}
          Cash {formatEur(snapshot.cashValue)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className={appDashboardDarkMetaClass}>
          {snapshot.isStale && !refresh?.liveRefreshAt ? "Stale prices · " : null}
          {updatedLabel}
        </p>
        {refresh ? (
          <RefreshPricesButton
            variant="compact"
            onClick={refresh.onRefresh}
            isRefreshing={refresh.isRefreshing}
            disabled={refresh.disabled}
            status={refresh.status}
          />
        ) : null}
      </div>
      {refresh?.message &&
      (refresh.status === "success" ||
        refresh.status === "error" ||
        refresh.status === "loading") ? (
        <p
          className={`mt-2 ${appDashboardDarkMetaClass}`}
          role="status"
          aria-live="polite"
          data-refresh-feedback={refresh.status}
        >
          {refresh.message}
        </p>
      ) : null}
    </article>
  );
}
