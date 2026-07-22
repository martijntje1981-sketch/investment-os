import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { GoalProgressCard } from "@/components/dashboard/GoalProgressCard";
import { DashboardSummarySkeleton } from "@/components/dashboard/DashboardSummarySkeleton";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

export function DashboardSummary({
  snapshot,
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <section
      aria-label="Portfolio summary"
      className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-4"
    >
      <div className="min-w-0 lg:col-span-2">
        <PortfolioValueCard snapshot={snapshot} />
      </div>
      <TodayCard snapshot={snapshot} />
      <GoalProgressCard snapshot={snapshot} />
    </section>
  );
}
