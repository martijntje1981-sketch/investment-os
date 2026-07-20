"use client";

import { useMemo } from "react";
import BottomNavigation from "@/components/home/BottomNav";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardGoalCard } from "@/components/dashboard/DashboardGoalCard";
import {
  DashboardHero,
  DashboardMoverCard,
} from "@/components/dashboard/DashboardHero";
import { DashboardInsightCard } from "@/components/dashboard/DashboardInsightCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildDashboardInsight } from "@/lib/client/dashboardInsight";
import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

export default function DashboardPage() {
  const {
    userSub,
    holdings,
    portfolioReady,
    recoveryOffer,
    syncState,
    migrationPreview,
    migratePortfolio,
    retrySync,
    useRemotePortfolio,
    keepLocalPortfolio,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const { snapshot: dividendSnapshot, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);
  const { snapshot: analystSnapshot, isLoading: analystLoading } =
    usePortfolioAnalyst(holdings, userSub, holdings.length > 0);

  const summary = useMemo(
    () => buildDashboardSummary(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const insight = useMemo(
    () => buildDashboardInsight(summary),
    [summary],
  );

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-[#F4F7FB] px-4 pb-32 pt-4 text-slate-950 sm:px-8 sm:pt-6">
        <div className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
          <PortfolioSyncBanner
            syncState={syncState}
            migrationPreview={migrationPreview}
            onMigrate={() => void migratePortfolio()}
            onRetry={() => void retrySync()}
            onUseRemote={useRemotePortfolio}
            onKeepLocal={keepLocalPortfolio}
          />

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={() => {
              recoverPortfolio();
            }}
            onDismiss={dismissRecovery}
          />

          {holdings.length === 0 && syncState.status !== "loading" ? (
            <DashboardEmptyState />
          ) : holdings.length > 0 ? (
            <>
              <DashboardHero summary={summary} />
              <DashboardInsightCard insight={insight} />
              <DashboardDividendCard
                snapshot={dividendSnapshot}
                isLoading={dividendsLoading}
              />
              <DashboardAnalystCard
                snapshot={analystSnapshot}
                isLoading={analystLoading}
              />

              <section className="grid gap-4 sm:grid-cols-2">
                <DashboardMoverCard
                  label="Biggest winner"
                  mover={summary.bestMover}
                  tone="positive"
                  performanceCoverageComplete={summary.performanceCoverageComplete}
                />
                <DashboardMoverCard
                  label="Biggest loser"
                  mover={summary.worstMover}
                  tone="negative"
                  performanceCoverageComplete={summary.performanceCoverageComplete}
                />
              </section>

              <DashboardMarketStatus lastUpdatedAt={summary.lastUpdatedAt} />
              <DashboardGoalCard summary={summary} />
            </>
          ) : null}

          <DashboardQuickActions />

          <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-xs leading-6 text-slate-500 sm:text-sm">
            Investment OS is a monitoring tool. It does not provide personal
            financial advice.
          </p>
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
