"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardCashIntelligenceCard } from "@/components/dashboard/DashboardCashIntelligenceCard";
import { DashboardContributionsCard } from "@/components/contributions/DashboardContributionsCard";
import { DashboardTodaysMarketBriefing } from "@/components/dashboard/DashboardTodaysMarketBriefing";
import { DashboardMarketPulseCard } from "@/components/dashboard/DashboardMarketPulseCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardExploreTools } from "@/components/dashboard/DashboardExploreTools";
import { DashboardPortfolioHistorySection } from "@/components/dashboard/DashboardPortfolioHistorySection";
import { PortfolioThirtySeconds } from "@/components/dashboard/PortfolioThirtySeconds";
import { DashboardPortfolioResilienceCard } from "@/components/dashboard/DashboardPortfolioResilienceCard";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import { DashboardFirstRunCue } from "@/components/dashboard/DashboardFirstRunCue";
import { DemoHoldingsCallout } from "@/components/example/DemoHoldingsCallout";
import { TrialStepsCard } from "@/components/example/TrialStepsCard";
import { DashboardProductionDebugMarker } from "@/components/dashboard/DashboardProductionDebugMarker";
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
import {
  buildPortfolioAnalysis,
  buildValuedPositions,
} from "@/lib/client/portfolioAnalysis";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useMarketSnapshotMetadata } from "@/lib/client/useMarketSnapshotMetadata";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildSmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { buildPersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
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
      dividends: null,
      analysis: portfolioAnalysis,
      exposure: exposureAllocation,
    });
  }, [
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

  const smartDashboard = useMemo(() => {
    const usesPreviousClose =
      Boolean(snapshot.isStale) ||
      /previous|market close|latest available/i.test(
        snapshot.dailyMoveContextLine,
      );
    const ledByName = snapshot.hasReliableHeroMoverData
      ? snapshot.heroTopMover?.holding.name ||
        snapshot.heroTopMover?.holding.symbol ||
        snapshot.topDailyDriver?.name ||
        snapshot.topDailyDriver?.symbol ||
        null
      : null;

    return buildSmartDashboardIntelligence({
      firstName,
      holdingCount: snapshot.holdingCount,
      hasDailyData: snapshot.hasDailyData,
      todayPercent: snapshot.todayPercent,
      usesPreviousClose,
      previousClosePhrase: previousClosePhraseFromContextLine(
        snapshot.dailyMoveContextLine,
      ),
      ledByName,
      goalProgressPercent: goalProgress.hasGoal
        ? goalProgress.currentProgressPercent
        : snapshot.goalProgress,
      goalReached: goalProgress.goalReached || snapshot.goalCompleted,
      hasSavedGoal,
      goalStatus: goalProgress.status,
      concentrationWeightPercent: snapshot.concentrationWeightPercent,
      upcomingEvents: payload.upcomingEvents,
      intelligence,
    });
  }, [
    firstName,
    goalProgress.currentProgressPercent,
    goalProgress.goalReached,
    goalProgress.hasGoal,
    goalProgress.status,
    hasSavedGoal,
    intelligence,
    payload.upcomingEvents,
    snapshot,
  ]);

  /** Phase 1B — compact personal briefing above the Dashboard motor. */
  const personalIntelligenceToday = useMemo(() => {
    if (holdings.length === 0) return null;
    const daily = summarizeDailyPerformance(holdings);
    const { valuedPositions } = buildValuedPositions(holdings);
    return buildPersonalIntelligenceToday({
      daily,
      holdingsWeights: valuedPositions.map((position) => ({
        symbol: position.holding.symbol,
        name: position.holding.name,
        weightPercent: position.weightPercent,
      })),
      exposure: exposureAllocation,
      intelligence,
      goals: goalProgress.hasGoal
        ? {
            hasGoal: true,
            status: goalProgress.status,
            goalReached: goalProgress.goalReached,
            currentProgressPercent: goalProgress.currentProgressPercent,
          }
        : null,
    });
  }, [
    exposureAllocation,
    goalProgress.currentProgressPercent,
    goalProgress.goalReached,
    goalProgress.hasGoal,
    goalProgress.status,
    holdings,
    intelligence,
  ]);


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
    <PageContainer stackClassName="gap-5 md:gap-7">
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

          {/* 1. Dashboard Hero (+ Smart Hero 2.0 / Daily Portfolio Briefing) */}
          <DashboardSummary
            snapshot={snapshot}
            pulse={portfolioPulse}
            smart={smartDashboard}
            performancePoints={
              monthHistory.data?.chartPoints ??
              weekHistory.data?.chartPoints ??
              null
            }
            refresh={{
              onRefresh: () => void refreshPrices(),
              isRefreshing,
              disabled: refreshDisabled,
              status: refreshStatus,
              message: refreshMessage,
              liveRefreshAt,
            }}
          />

          {personalIntelligenceToday ? (
            <PortfolioThirtySeconds
              intelligence={personalIntelligenceToday}
              holdings={holdings}
              goal={goal}
              hasSavedGoal={hasSavedGoal}
            />
          ) : null}

          <DashboardPortfolioResilienceCard
            holdings={holdings}
            goal={goal}
            hasSavedGoal={hasSavedGoal}
          />

          {/* 2. Your Holdings */}
          <HoldingsToday snapshot={snapshot} />

          {/* 3. Today’s Market Briefing */}
          <DashboardTodaysMarketBriefing
            intelligence={intelligence}
            intelligenceFromCache={intelligenceFromCache}
            goalProgress={goalProgress}
            upcomingEvents={payload.upcomingEvents}
            marketsClosed={marketsClosed}
            heroBriefingText={smartDashboard.briefing.text}
          />

          {/* 4. Market Pulse */}
          <DashboardMarketPulseCard
            holdings={holdings}
            leadLabel={
              portfolioHealthProfile.classification.cryptoWeight >= 20
                ? "Bitcoin and linked markets may be moving with your portfolio."
                : "See commodities, crypto and markets connected to your holdings."
            }
          />

          {/* 5. Latest Perspectives */}
          <DashboardPerspectivesWidget />

          {/* 6. Cash Intelligence */}
          <DashboardCashIntelligenceCard holdings={holdings} />

          {/* 7. Portfolio History */}
          <DashboardPortfolioHistorySection
            holdings={holdings}
            history={monthHistory.data}
            portfolioValue={snapshot.portfolioValue}
            portfolioValueAvailable={snapshot.portfolioValueAvailable}
            emphasisNote={smartDashboard.emphasis.historyNote}
          />

          {/* 8. Portfolio Exposure */}
          <DashboardPortfolioExposureCard allocation={exposureAllocation} />

          {/* 9. Contributions */}
          <DashboardContributionsCard
            snapshot={snapshot}
            holdings={holdings.map((holding) => ({
              id: holding.id,
              symbol: holding.symbol,
              name: holding.name,
              assetType: holding.assetType,
            }))}
          />

          {/* 10. Understand your portfolio */}
          <DashboardExploreTools
            emphasizeGoals={smartDashboard.emphasis.exploreGoalsHighlight}
          />

          <PageRelatedLinks
            purpose="How is my portfolio doing today?"
            links={[
              { href: "/analysis", label: "Open Analysis" },
              { href: "/portfolio-history", label: "Portfolio History" },
              { href: "/portfolio-health", label: "Portfolio Scorecard" },
            ]}
            className="px-1"
          />

          {/* 11. Trading Hours */}
          <DashboardMarketStatus lastUpdatedAt={marketUpdatedAt} />
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
