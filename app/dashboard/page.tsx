"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { DashboardZeroHoldingsHero } from "@/components/dashboard/DashboardZeroHoldingsHero";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardCashIntelligenceCard } from "@/components/dashboard/DashboardCashIntelligenceCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardContributionsCard } from "@/components/contributions/DashboardContributionsCard";
import { DashboardIntelligencePreview } from "@/components/dashboard/DashboardIntelligencePreview";
import { DashboardTodaysDecision } from "@/components/dashboard/DashboardTodaysDecision";
import { DashboardMarketPulseCard } from "@/components/dashboard/DashboardMarketPulseCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardPortfolioScorecard } from "@/components/dashboard/DashboardPortfolioScorecard";
import { DashboardProductionDebugMarker } from "@/components/dashboard/DashboardProductionDebugMarker";
import { DashboardUpcomingEventsWidget } from "@/components/dashboard/DashboardUpcomingEventsWidget";
import { DashboardPerspectivesWidget } from "@/components/dashboard/DashboardPerspectivesWidget";
import { HoldingsToday } from "@/components/dashboard/HoldingsToday";
import { DashboardPortfolioExposureCard } from "@/components/dashboard/DashboardPortfolioExposureCard";
import { DashboardInsightCard } from "@/components/dashboard/DashboardInsightCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useMarketSnapshotMetadata } from "@/lib/client/useMarketSnapshotMetadata";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import { usePortfolioInsight } from "@/lib/client/usePortfolioInsight";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioHealthScoreV1 } from "@/lib/services/portfolio/healthScore";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioScorecard } from "@/lib/services/portfolio/scorecard";
import { buildMomentumScoreInputFromHistory } from "@/lib/services/portfolio/scorecard/momentumInputs";
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
    saveHoldings,
    migratePortfolio,
    retrySync,
    useRemotePortfolio,
    keepLocalPortfolio,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const {
    refreshPrices,
    isRefreshing,
    status: refreshStatus,
    message: refreshMessage,
    liveRefreshAt,
    disabled: refreshDisabled,
  } = useLivePortfolioPriceRefresh({
    userSub,
    holdings,
    saveHoldings,
    ready: portfolioReady,
    idleMessage: "Dashboard prices use the latest available market data.",
  });
  const { goal, hasSavedGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { snapshot: dividendSnapshot, isLoading: dividendsLoading } =
    usePortfolioDividends(holdings, userSub, holdings.length > 0);
  const { snapshot: analystSnapshot, isLoading: analystLoading } =
    usePortfolioAnalyst(holdings, userSub, holdings.length > 0);

  const {
    intelligence,
    payload,
    isStale: intelligenceFromCache,
  } = useInvestmentIntelligence(holdings, userSub, holdings.length > 0);
  const { lastRefreshedAt: snapshotRefreshedAt } = useMarketSnapshotMetadata(
    portfolioReady && holdings.length > 0,
  );

  const weekHistory = usePortfolioPerformanceHistory(holdings, "1W");
  const monthHistory = usePortfolioPerformanceHistory(holdings, "1M");

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const marketUpdatedAt = snapshotRefreshedAt ?? snapshot.lastUpdatedAt;

  const portfolioAnalysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );

  const portfolioHealthProfile = useMemo(() => {
    return buildPortfolioHealthProfile({
      holdings,
      goal,
      hasSavedGoal,
      dividends: dividendsLoading ? null : dividendSnapshot,
      analysis: portfolioAnalysis,
      exposure: exposureAllocation,
    });
  }, [
    dividendSnapshot,
    dividendsLoading,
    exposureAllocation,
    goal,
    hasSavedGoal,
    holdings,
    portfolioAnalysis,
  ]);

  const portfolioHealthScore = useMemo(
    () =>
      buildPortfolioHealthScoreV1({
        holdings,
        analysis: portfolioAnalysis,
        exposure: exposureAllocation,
        profile: portfolioHealthProfile,
        goal,
        hasSavedGoal,
        dividends: dividendsLoading ? null : dividendSnapshot,
        isStale: snapshot.isStale,
      }),
    [
      dividendSnapshot,
      dividendsLoading,
      exposureAllocation,
      goal,
      hasSavedGoal,
      holdings,
      portfolioAnalysis,
      portfolioHealthProfile,
      snapshot.isStale,
    ],
  );

  const portfolioScorecard = useMemo(() => {
    if (holdings.length === 0) return null;
    const momentum = buildMomentumScoreInputFromHistory({
      week: weekHistory.data,
      month: monthHistory.data,
      holdings,
    });
    const hasPerformanceHistory = Boolean(
      (weekHistory.data?.success &&
        weekHistory.data.investmentReturnPercent != null) ||
      (monthHistory.data?.success &&
        monthHistory.data.investmentReturnPercent != null),
    );
    return buildPortfolioScorecard({
      health: portfolioHealthScore,
      goal,
      hasSavedGoal,
      goalProgress,
      analysis: portfolioAnalysis,
      exposure: exposureAllocation,
      momentum,
      hasPerformanceHistory,
      holdings,
    });
  }, [
    exposureAllocation,
    goal,
    goalProgress,
    hasSavedGoal,
    holdings,
    monthHistory.data,
    portfolioAnalysis,
    portfolioHealthScore,
    weekHistory.data,
  ]);

  const { insight, source: insightSource } = usePortfolioInsight(
    portfolioScorecard,
    holdings.length > 0 && portfolioScorecard != null,
  );

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

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <PageContainer stackClassName="gap-6 md:gap-8">
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

      {needsPortfolioSetup({
        authenticated: Boolean(userSub),
        holdingsCount: holdings.length,
        portfolioReady,
        syncLoading: syncState.status === "loading",
      }) ? (
        <>
          <DashboardZeroHoldingsHero />
          <DashboardPerspectivesWidget />
          <DashboardMarketPulseCard
            holdings={holdings}
            leadLabel="Browse general market moves while you set up your portfolio."
          />
        </>
      ) : holdings.length > 0 ? (
        <>
          {/* 1. Portfolio hero */}
          <DashboardSummary
            snapshot={snapshot}
            welcomeFirstName={firstName}
            refresh={{
              onRefresh: () => void refreshPrices(),
              isRefreshing,
              disabled: refreshDisabled,
              status: refreshStatus,
              message: refreshMessage,
              liveRefreshAt,
            }}
          />

          {/* 2. Portfolio Scorecard */}
          {portfolioScorecard ? (
            <DashboardPortfolioScorecard scorecard={portfolioScorecard} />
          ) : null}

          {/* 3. Today’s Decision + Market Briefing */}
          <div className="grid min-w-0 gap-4 md:gap-5 lg:grid-cols-2 lg:items-stretch">
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
            />
          </div>

          {/* 4. Today’s Portfolio Insight */}
          <DashboardInsightCard insight={insight} source={insightSource} />

          {/* 5. Cash Intelligence (Health lives in Scorecard) */}
          <DashboardCashIntelligenceCard holdings={holdings} />

          {/* 6. Market Pulse */}
          <DashboardMarketPulseCard
            holdings={holdings}
            leadLabel={
              portfolioHealthProfile.classification.cryptoWeight >= 20
                ? "Bitcoin and linked markets may be moving with your portfolio."
                : "See commodities, crypto and markets connected to your holdings."
            }
          />

          {/* 7. Your Holdings */}
          <HoldingsToday snapshot={snapshot} />

          {/* 8. Remaining supporting cards */}
          <div className="space-y-6 md:space-y-8">
            <DashboardUpcomingEventsWidget />
            <DashboardPerspectivesWidget />
            <DashboardPortfolioExposureCard allocation={exposureAllocation} />

            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <DashboardContributionsCard snapshot={snapshot} />
              <DashboardDividendCard
                snapshot={dividendSnapshot}
                isLoading={dividendsLoading}
              />
            </div>

            <DashboardAnalystCard
              snapshot={analystSnapshot}
              isLoading={analystLoading}
            />

            <DashboardMarketStatus lastUpdatedAt={marketUpdatedAt} />
          </div>
        </>
      ) : null}

      <p className="rounded-[28px] border border-slate-200/70 bg-white/95 px-5 py-5 text-center text-[13px] leading-[1.7] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 sm:text-sm">
        Tobailey is a monitoring tool. It does not provide personal financial
        advice.
      </p>

      <DashboardProductionDebugMarker />
    </PageContainer>
  );
}
