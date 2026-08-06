import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

export type DashboardRefreshControl = {
  onRefresh: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
  status?: RefreshPricesUiStatus;
  message?: string | null;
  liveRefreshAt?: string | null;
};

export function DashboardSummary({
  snapshot,
  welcomeFirstName = null,
  isLoading = false,
  refresh,
  pulse = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  /** Existing first name only — never fetch solely for this greeting. */
  welcomeFirstName?: string | null;
  isLoading?: boolean;
  refresh?: DashboardRefreshControl;
  pulse?: PortfolioPulseResult | null;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section aria-label="Portfolio summary" className="space-y-6 md:space-y-7">
      <PortfolioValueCard
        snapshot={snapshot}
        refresh={refresh}
        welcomeFirstName={welcomeFirstName}
        pulse={pulse}
      />
    </section>
  );
}
