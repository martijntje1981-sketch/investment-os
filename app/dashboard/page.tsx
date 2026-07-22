"use client";

import { useMemo } from "react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardGoalProgressCard } from "@/components/dashboard/DashboardGoalProgressCard";
import { DashboardIntelligenceSummary } from "@/components/dashboard/DashboardIntelligenceSummary";
import {
  DashboardMoverCard,
  DashboardPortfolioHero,
} from "@/components/dashboard/DashboardHero";
import { DashboardInsightCard } from "@/components/dashboard/DashboardInsightCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildDashboardInsightSections } from "@/lib/client/dashboardInsight";
import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
import { useDiscoverSnapshot } from "@/lib/client/discoverSnapshot";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
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
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { snapshot: dividendSnapshot, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);
  const { snapshot: analystSnapshot, isLoading: analystLoading } =
    usePortfolioAnalyst(holdings, userSub, holdings.length > 0);

  const { intelligence, payload } = useInvestmentIntelligence(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const { snapshot: discoverSnapshot } = useDiscoverSnapshot({
    userSub,
    holdings,
    goal,
    enabled: portfolioReady && holdings.length > 0,
  });

  const summary = useMemo(
    () => buildDashboardSummary(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const insightSections = useMemo(
    () => buildDashboardInsightSections(summary),
    [summary],
  );

  const marketsClosed = useMemo(() => areMajorMarketsClosed(), []);

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#F4F7FB] px-4 pb-28 pt-3 text-slate-950 md:px-8 md:pb-32 md:pt-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 md:space-y-6">
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
            <DashboardPortfolioHero summary={summary} />
              <DashboardIntelligenceSummary
                intelligence={intelligence}
                goalProgress={goalProgress}
                upcomingEvents={payload.upcomingEvents}
                marketsClosed={marketsClosed}
                missedItems={discoverSnapshot?.thingsYouMayHaveMissed ?? []}
              />
            <DashboardGoalProgressCard progress={goalProgress} />
            <section className="space-y-5 md:space-y-6">
              <DashboardDividendCard
                snapshot={dividendSnapshot}
                isLoading={dividendsLoading}
              />
              <DashboardAnalystCard
                snapshot={analystSnapshot}
                isLoading={analystLoading}
              />
            </section>
            <DashboardInsightCard sections={insightSections} />
            <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
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
          </>
        ) : null}

        <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-sm leading-relaxed text-slate-500">
          Investment OS is a monitoring tool. It does not provide personal
          financial advice.
        </p>
      </div>
    </main>
  );
}
