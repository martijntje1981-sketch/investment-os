import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";

export function PortfolioIntro({
  freshnessLabel,
  onRefreshPrices,
  isRefreshing,
  refreshDisabled,
  refreshStatus,
}: {
  freshnessLabel: string | null;
  onRefreshPrices: () => void;
  isRefreshing: boolean;
  refreshDisabled: boolean;
  refreshStatus: RefreshPricesUiStatus;
}) {
  return (
    <header className="min-w-0" data-testid="portfolio-intro">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={appHeroMetricLabelClass}>Portfolio</p>
          <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
            What you own
          </h1>
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            Holdings, value, and how you manage them
          </p>
          {freshnessLabel ? (
            <p
              className={`mt-1 ${appDashboardDarkMetaClass}`}
              data-testid="portfolio-hero-freshness"
            >
              {freshnessLabel}
            </p>
          ) : null}
        </div>
        <RefreshPricesButton
          variant="compact"
          appearance="onDark"
          onClick={onRefreshPrices}
          isRefreshing={isRefreshing}
          disabled={refreshDisabled}
          status={refreshStatus}
        />
      </div>
    </header>
  );
}
