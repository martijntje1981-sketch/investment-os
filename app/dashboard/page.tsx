"use client";

import { useMemo } from "react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardGoalProgressCard } from "@/components/dashboard/DashboardGoalProgressCard";
import { DashboardIntelligenceSummary } from "@/components/dashboard/DashboardIntelligenceSummary";
import { DashboardMoverCard } from "@/components/dashboard/DashboardHero";
import { DashboardPortfolioHealthCard } from "@/components/dashboard/DashboardPortfolioHealthCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { HoldingsToday } from "@/components/dashboard/HoldingsToday";
import { DashboardInsightCard } from "@/components/dashboard/DashboardInsightCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildDashboardInsightSections } from "@/lib/client/dashboardInsight";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { useDiscoverSnapshot } from "@/lib/client/discoverSnapshot";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useMarketSnapshotMetadata } from "@/lib/client/useMarketSnapshotMetadata";
import { buildPortfolioHealthScore } from "@/lib/services/portfolio/portfolioHealthScore";

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
  const { lastRefreshedAt: snapshotRefreshedAt } = useMarketSnapshotMetadata(
    portfolioReady && holdings.length > 0,
  );

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const marketUpdatedAt = snapshotRefreshedAt ?? snapshot.lastUpdatedAt;

  const insightSections = useMemo(
    () => buildDashboardInsightSections(snapshot),
    [snapshot],
  );

  const portfolioHealth = useMemo(() => {
    const analysis = buildPortfolioAnalysis(holdings);
    return buildPortfolioHealthScore({
      concentrationLevel: analysis.concentrationLevel,
      investmentCount: analysis.investmentCount,
      largestPositionWeightPercent: analysis.largestPosition?.weightPercent ?? null,
      cashWeightPercent: analysis.cashWeightPercent,
      goalProgress,
      isStale: snapshot.isStale,
      portfolioStatus: intelligence.portfolioStatus,
      quietMarket: intelligence.quietMarket,
    });
  }, [goalProgress, holdings, intelligence.portfolioStatus, intelligence.quietMarket, snapshot.isStale]);

  const marketsClosed = useMemo(() => areMajorMarketsClosed(), []);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <PageContainer>
      <PageHero
        title="Portfolio Dashboard"
        subtitle="Monitor performance, allocation and progress towards your goal."
      />

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
            <DashboardSummary snapshot={snapshot} />
            <DashboardPortfolioHealthCard health={portfolioHealth} />
            <HoldingsToday snapshot={snapshot} />
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
                mover={snapshot.bestMover}
                tone="positive"
                performanceCoverageComplete={snapshot.performanceCoverageComplete}
              />
              <DashboardMoverCard
                label="Biggest loser"
                mover={snapshot.worstMover}
                tone="negative"
                performanceCoverageComplete={snapshot.performanceCoverageComplete}
              />
            </section>
            <DashboardMarketStatus lastUpdatedAt={marketUpdatedAt} />
          </>
        ) : null}

        <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-sm leading-relaxed text-slate-500">
          Investment OS is a monitoring tool. It does not provide personal
          financial advice.
        </p>
    </PageContainer>
  );
}
