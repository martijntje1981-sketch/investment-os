import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { SmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

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
  pulse = null,
  smart,
  performancePoints = null,
  weekPerformancePoints = null,
  monthPerformancePoints = null,
  pulseAttributionEnrichment = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
  refresh?: DashboardRefreshControl;
  pulse?: PortfolioPulseResult | null;
  /** Phase 3C Smart Hero + Today's Focus — built once on the Dashboard page. */
  smart: SmartDashboardIntelligence;
  /** @deprecated Prefer week/month props. */
  performancePoints?: PortfolioPerformancePoint[] | null;
  weekPerformancePoints?: PortfolioPerformancePoint[] | null;
  monthPerformancePoints?: PortfolioPerformancePoint[] | null;
  pulseAttributionEnrichment?: {
    daily?: string[];
    weekly?: string[];
    monthly?: string[];
  } | null;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section aria-label="Portfolio summary" className="space-y-5 md:space-y-6">
      <PortfolioValueCard
        snapshot={snapshot}
        refresh={refresh}
        pulse={pulse}
        smart={smart}
        performancePoints={performancePoints}
        weekPerformancePoints={weekPerformancePoints}
        monthPerformancePoints={monthPerformancePoints}
        pulseAttributionEnrichment={pulseAttributionEnrichment}
      />
    </section>
  );
}
