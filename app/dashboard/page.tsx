"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardDividendCard } from "@/components/dashboard/DashboardDividendCard";
import { DashboardCashIntelligenceCard } from "@/components/dashboard/DashboardCashIntelligenceCard";
import { DashboardAnalystCard } from "@/components/dashboard/DashboardAnalystCard";
import { DashboardContributionsCard } from "@/components/contributions/DashboardContributionsCard";
import { DashboardTodaysMarketBriefing } from "@/components/dashboard/DashboardTodaysMarketBriefing";
import { DashboardMarketPulseCard } from "@/components/dashboard/DashboardMarketPulseCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardPortfolioPulseCard } from "@/components/dashboard/DashboardPortfolioPulseCard";
import { DashboardExploreTools } from "@/components/dashboard/DashboardExploreTools";
import { PortfolioHistoryNavCard } from "@/components/portfolioHistory/PortfolioHistoryNavCard";
import { DashboardFirstRunCue } from "@/components/dashboard/DashboardFirstRunCue";
import { DemoHoldingsCallout } from "@/components/example/DemoHoldingsCallout";
import { TrialStepsCard } from "@/components/example/TrialStepsCard";
import { DashboardProductionDebugMarker } from "@/components/dashboard/DashboardProductionDebugMarker";
import { DashboardUpcomingEventsWidget } from "@/components/dashboard/DashboardUpcomingEventsWidget";
import { DashboardPerspectivesWidget } from "@/components/dashboard/DashboardPerspectivesWidget";
import { HoldingsToday } from "@/components/dashboard/HoldingsToday";
import { DashboardPortfolioExposureCard } from "@/components/dashboard/DashboardPortfolioExposureCard";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import { ExamplePortfolioPreparation } from "@/components/examplePortfolio/ExamplePortfolioPreparation";
import { useExampleActiveStatus } from "@/lib/client/useExampleActiveStatus";
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
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
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

  const marketsClosed = useMemo(() => areMajorMarketsClosed(), []);

  const portfolioPulse = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildPortfolioPulse({
      daily: {
        holdings,
        marketsClosed,
        href: "/market-pulse",
      },
      weekly: {
        week: weekHistory.data,
        month: monthHistory.data,
        href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      },
    });
  }, [holdings, marketsClosed, monthHistory.data, weekHistory.data]);

  const exampleActive = useExampleActiveStatus(
    portfolioReady && Boolean(userSub),
  );

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
        <DashboardEmptyState userSub={userSub} />
      ) : holdings.length > 0 ? (
        <>
          <ExamplePortfolioPreparation
            userSub={userSub}
            portfolioReady={portfolioReady}
            hasHoldings={holdings.length > 0}
            isRefreshing={isRefreshing}
            refreshPrices={refreshPrices}
          />

          <DashboardFirstRunCue
            userSub={userSub}
            exampleActive={exampleActive}
          />

          {exampleActive ? (
            <>
              <DemoHoldingsCallout
                exampleActive={exampleActive}
                holdings={holdings}
              />
              <TrialStepsCard />
            </>
          ) : null}

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

          {/* 2–3. Portfolio Pulse + Your Holdings (tight stack) */}
          <div className="flex min-w-0 flex-col gap-4 md:gap-5">
            {portfolioPulse ? (
              <DashboardPortfolioPulseCard pulse={portfolioPulse} />
            ) : null}
            <HoldingsToday snapshot={snapshot} />
          </div>
          {/* 4. Combined Today’s market briefing */}
          <DashboardTodaysMarketBriefing
            intelligence={intelligence}
            intelligenceFromCache={intelligenceFromCache}
            goalProgress={goalProgress}
            upcomingEvents={payload.upcomingEvents}
            marketsClosed={marketsClosed}
          />

          {/* 5. Cash Intelligence */}
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

          <PortfolioHistoryNavCard />

          <DashboardExploreTools />

          {/* 7. Remaining supporting cards */}
          <div className="space-y-6 md:space-y-8">
            <DashboardUpcomingEventsWidget />
            <DashboardPerspectivesWidget />
            <DashboardPortfolioExposureCard allocation={exposureAllocation} />

            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <DashboardContributionsCard
                snapshot={snapshot}
                holdings={holdings.map((holding) => ({
                  id: holding.id,
                  symbol: holding.symbol,
                  name: holding.name,
                  assetType: holding.assetType,
                }))}
              />
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
