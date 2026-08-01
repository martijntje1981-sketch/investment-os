"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardGoalProgressCard } from "@/components/dashboard/DashboardGoalProgressCard";
import { DashboardContributionsCard } from "@/components/contributions/DashboardContributionsCard";
import { DashboardIntelligencePreview } from "@/components/dashboard/DashboardIntelligencePreview";
import { DashboardPortfolioHealthCard } from "@/components/dashboard/DashboardPortfolioHealthCard";
import { DashboardMarketPulseCard } from "@/components/dashboard/DashboardMarketPulseCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardTodaysDecision } from "@/components/dashboard/DashboardTodaysDecision";
import { DashboardProductionDebugMarker } from "@/components/dashboard/DashboardProductionDebugMarker";
import { HoldingsToday } from "@/components/dashboard/HoldingsToday";
import { DashboardPortfolioExposureCard } from "@/components/dashboard/DashboardPortfolioExposureCard";
import { DashboardInsightCard } from "@/components/dashboard/DashboardInsightCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildDashboardInsightSections } from "@/lib/client/dashboardInsight";
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
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
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

  const { intelligence, payload, isStale: intelligenceFromCache } = useInvestmentIntelligence(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const { lastRefreshedAt: snapshotRefreshedAt } = useMarketSnapshotMetadata(
    portfolioReady && holdings.length > 0,
  );

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const marketUpdatedAt = snapshotRefreshedAt ?? snapshot.lastUpdatedAt;

  const insightSections = useMemo(
    () => buildDashboardInsightSections(snapshot),
    [snapshot],
  );

  const portfolioHealthProfile = useMemo(() => {
    const analysis = buildPortfolioAnalysis(holdings);
    return buildPortfolioHealthProfile({
      holdings,
      goal,
      hasSavedGoal,
      dividends: dividendsLoading ? null : dividendSnapshot,
      analysis,
      exposure: exposureAllocation,
    });
  }, [
    dividendSnapshot,
    dividendsLoading,
    exposureAllocation,
    goal,
    hasSavedGoal,
    holdings,
  ]);

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
    <PageContainer
      className="bg-[#F4F7FB] px-4 pb-32 pt-[4.5rem] sm:px-6 sm:pt-[5rem]"
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

      {needsPortfolioSetup({
        authenticated: Boolean(userSub),
        holdingsCount: holdings.length,
        portfolioReady,
        syncLoading: syncState.status === "loading",
      }) ? (
        <DashboardEmptyState userSub={userSub} />
      ) : holdings.length > 0 ? (
        <>
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

          <div className="space-y-6 md:space-y-8">
            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
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

            <HoldingsToday snapshot={snapshot} />

            <DashboardPortfolioExposureCard allocation={exposureAllocation} />

            <DashboardPortfolioHealthCard profile={portfolioHealthProfile} />

            <DashboardMarketPulseCard
              leadLabel={
                portfolioHealthProfile.classification.cryptoWeight >= 20
                  ? "Bitcoin and linked markets may be moving with your portfolio."
                  : "See commodities, crypto and markets connected to your holdings."
              }
            />

            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <DashboardGoalProgressCard progress={goalProgress} />
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

            <DashboardInsightCard sections={insightSections} />

            <DashboardMarketStatus lastUpdatedAt={marketUpdatedAt} />
          </div>
        </>
      ) : null}

      <p className="rounded-[28px] border border-slate-200/70 bg-white/95 px-5 py-5 text-center text-[13px] leading-[1.7] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 sm:text-sm">
        Tobailey is a monitoring tool. It does not provide personal
        financial advice.
      </p>

      <DashboardProductionDebugMarker />
    </PageContainer>
  );
}
