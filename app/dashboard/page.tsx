"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardGoalProgressCard } from "@/components/dashboard/DashboardGoalProgressCard";
import { DashboardIntelligencePreview } from "@/components/dashboard/DashboardIntelligencePreview";
import { DashboardMoverCard } from "@/components/dashboard/DashboardHero";
import { DashboardPortfolioHealthCard } from "@/components/dashboard/DashboardPortfolioHealthCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardTodaysDecision } from "@/components/dashboard/DashboardTodaysDecision";
import { DashboardProductionDebugMarker } from "@/components/dashboard/DashboardProductionDebugMarker";
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
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useMarketSnapshotMetadata } from "@/lib/client/useMarketSnapshotMetadata";
import { buildPortfolioHealthScore } from "@/lib/services/portfolio/portfolioHealthScore";
import { logDashboardProductionDiagnostics } from "@/lib/client/investmentOsProductionDebug";

export default function DashboardPage() {
  const pathname = usePathname();
  const dashboardDebugLoggedRef = useRef(false);
  const firstName = useAuthenticatedFirstName();
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

  const { intelligence, payload, isStale: intelligenceFromCache } = useInvestmentIntelligence(
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

  const dashboardSummaryRendered = portfolioReady && holdings.length > 0;
  const dashboardTodaysDecisionRendered = dashboardSummaryRendered;

  useEffect(() => {
    if (!portfolioReady || dashboardDebugLoggedRef.current) {
      return;
    }

    dashboardDebugLoggedRef.current = true;
    logDashboardProductionDiagnostics({
      route: pathname,
      dashboardSummaryRendered,
      dashboardTodaysDecisionRendered,
    });
  }, [
    dashboardSummaryRendered,
    dashboardTodaysDecisionRendered,
    pathname,
    portfolioReady,
  ]);

  const heroTitle = firstName
    ? `Welcome back, ${firstName}`
    : "Portfolio Dashboard";

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <PageContainer
      className="bg-[#F4F7FB] px-4 pb-32 pt-6 sm:px-6 sm:pt-8"
      stackClassName="gap-6 md:gap-8"
    >
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
          <DashboardSummary
            snapshot={snapshot}
            welcome={
              <PageHero
                embedded
                variant="dashboard"
                title={heroTitle}
                subtitle="Your portfolio at a glance — value, today's move, and what needs attention."
              />
            }
          />

          <div className="space-y-6 md:space-y-8">
            <DashboardTodaysDecision
              intelligence={intelligence}
              intelligenceFromCache={intelligenceFromCache}
              goalProgress={goalProgress}
              upcomingEvents={payload.upcomingEvents}
              marketsClosed={marketsClosed}
            />

            <DashboardIntelligencePreview
              intelligence={intelligence}
              goalProgress={goalProgress}
              marketsClosed={marketsClosed}
              intelligenceFromCache={intelligenceFromCache}
              missedItems={discoverSnapshot?.thingsYouMayHaveMissed ?? []}
            />

            <HoldingsToday snapshot={snapshot} />

            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <DashboardPortfolioHealthCard health={portfolioHealth} />
              <DashboardGoalProgressCard progress={goalProgress} />
            </div>

            <section className="space-y-6 md:space-y-7">
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

            <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
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
          </div>
        </>
      ) : null}

      <p className="rounded-[28px] border border-slate-200/70 bg-white/95 px-5 py-5 text-center text-[13px] leading-[1.7] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 sm:text-sm">
        Investment OS is a monitoring tool. It does not provide personal
        financial advice.
      </p>

      <DashboardProductionDebugMarker />
    </PageContainer>
  );
}
