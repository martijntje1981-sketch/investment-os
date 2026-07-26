import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { GoalProgressCard } from "@/components/dashboard/GoalProgressCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import type { ReactNode } from "react";

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
  welcome,
  isLoading = false,
  refresh,
}: {
  snapshot: DashboardPortfolioSnapshot;
  welcome?: ReactNode;
  isLoading?: boolean;
  refresh?: DashboardRefreshControl;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section aria-label="Portfolio summary" className="space-y-6 md:space-y-7">
      {welcome ? (
        <div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-800/70 bg-slate-950 text-white shadow-[0_16px_40px_-20px_rgba(15,23,42,0.45)] md:rounded-[28px]">
          {welcome}
        </div>
      ) : null}
      <PortfolioValueCard snapshot={snapshot} refresh={refresh} />
      <GoalProgressCard snapshot={snapshot} />
    </section>
  );
}
