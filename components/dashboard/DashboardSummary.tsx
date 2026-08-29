import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { SmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";

export type DashboardRefreshControl = {
  onRefresh: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
  status?: RefreshPricesUiStatus;
  message?: string | null;
  liveRefreshAt?: string | null;
  displayFreshnessAt?: string | null;
};

export function DashboardSummary({
  snapshot,
  isLoading = false,
  refresh,
  smart,
  performancePoints = null,
  weekPerformancePoints = null,
  monthPerformancePoints = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
  refresh?: DashboardRefreshControl;
  /** Phase 3C Smart Hero — built once on the Dashboard page. */
  smart: SmartDashboardIntelligence;
  /** @deprecated Prefer week/month props. */
  performancePoints?: PortfolioPerformancePoint[] | null;
  weekPerformancePoints?: PortfolioPerformancePoint[] | null;
  monthPerformancePoints?: PortfolioPerformancePoint[] | null;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section aria-label="Portfolio summary">
      <PortfolioValueCard
        snapshot={snapshot}
        refresh={refresh}
        smart={smart}
        performancePoints={performancePoints}
        weekPerformancePoints={weekPerformancePoints}
        monthPerformancePoints={monthPerformancePoints}
      />
    </section>
  );
}
