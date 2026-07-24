import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { GoalProgressCard } from "@/components/dashboard/GoalProgressCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import { appHeroShellClass } from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { ReactNode } from "react";

export function DashboardSummary({
  snapshot,
  welcome,
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  welcome?: ReactNode;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section aria-label="Portfolio summary" className="space-y-5">
      <div className={appHeroShellClass}>
        {welcome}
        <div className="grid min-w-0 grid-cols-1 border-t border-white/10 md:grid-cols-2">
          <PortfolioValueCard snapshot={snapshot} embedded />
          <TodayCard snapshot={snapshot} embedded />
        </div>
      </div>
      <GoalProgressCard snapshot={snapshot} />
    </section>
  );
}
