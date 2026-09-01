"use client";

import { useMemo } from "react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardPersonalIntelligence } from "@/components/dashboard/DashboardPersonalIntelligence";
import { DashboardSecondaryNav } from "@/components/dashboard/DashboardSecondaryNav";
import { DashboardFirstRunCue } from "@/components/dashboard/DashboardFirstRunCue";
import { FirstIntelligenceMoment } from "@/components/onboarding/FirstIntelligenceMoment";
import { DemoHoldingsCallout } from "@/components/example/DemoHoldingsCallout";
import { TrialStepsCard } from "@/components/example/TrialStepsCard";
import { HoldingsToday } from "@/components/dashboard/HoldingsToday";
import { DashboardGoalProgressStrip } from "@/components/dashboard/DashboardGoalProgressStrip";
import { ExamplePortfolioPreparation } from "@/components/examplePortfolio/ExamplePortfolioPreparation";
import { useExampleActiveStatus } from "@/lib/client/useExampleActiveStatus";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import { usePortfolioNavSnapshotCapture } from "@/lib/client/usePortfolioNavSnapshotCapture";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useAfterFirstPaint } from "@/lib/client/useAfterFirstPaint";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildSmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import { selectDashboardPersonalIntelligence } from "@/lib/client/dashboardPersonalIntelligence";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useChangeIntelligence } from "@/lib/client/useChangeIntelligence";
import { buildLookingAhead } from "@/lib/services/lookingAhead";
import {
  applyPortfolioChangeAccess,
  buildPortfolioChangeAttention,
  resolveSmartAlertsAccessMode,
} from "@/lib/services/portfolioChangeDetection";
import {
  CompleteTrialIndicator,
  FreeIntelligenceNote,
} from "@/components/product/ProductAccessNotes";
import {
  filterHoldingsByIntelligenceScope,
  resolveIntelligenceScope,
} from "@/lib/services/intelligenceScope";

export default function DashboardPage() {
  const firstName = useAuthenticatedFirstName();
  const {
    userSub,
    authReady,
    holdings,
    activePortfolioId,
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
    displayFreshnessAt,
    disabled: refreshDisabled,
    pricesSettled,
    manualRefreshGeneration,
  } = useLivePortfolioPriceRefresh({
    userSub,
    holdings,
    saveHoldings,
    ready: portfolioReady,
    idleMessage: "Dashboard prices use the latest available market data.",
  });
  const { goal, hasSavedGoal } = useUserGoal();

  const intelligenceScope = useMemo(
    () => resolveIntelligenceScope().scope,
    [],
  );
  const scopedHoldings = useMemo(
    () => filterHoldingsByIntelligenceScope(holdings, intelligenceScope),
    [holdings, intelligenceScope],
  );

  const goalProgress = useGoalProgress({
    holdings: scopedHoldings,
    goal,
    hasSavedGoal,
  });
  const historyEnabled = useAfterFirstPaint(
    portfolioReady && holdings.length > 0,
  );

  const { intelligence, payload } = useInvestmentIntelligence(
    holdings,
    userSub,
    holdings.length > 0,
  );

  const weekHistory = usePortfolioPerformanceHistory(
    holdings,
    "1W",
    historyEnabled,
  );
  const monthHistory = usePortfolioPerformanceHistory(
    holdings,
    "1M",
    historyEnabled,
  );
  const yearHistory = usePortfolioPerformanceHistory(
    holdings,
    "1Y",
    historyEnabled && hasSavedGoal,
  );
  const allHistory = usePortfolioPerformanceHistory(
    holdings,
    "ALL",
    historyEnabled && hasSavedGoal,
  );

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const resilienceProfile = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });
  }, [goal, hasSavedGoal, holdings]);

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
        ? goalProgress.portfolioValueAvailable
          ? goalProgress.currentProgressPercent
          : null
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
    goalProgress.portfolioValueAvailable,
    goalProgress.status,
    hasSavedGoal,
    intelligence,
    payload.upcomingEvents,
    snapshot,
  ]);

  const productAccess = useProductAccess(
    portfolioReady && Boolean(userSub),
  );

  usePortfolioNavSnapshotCapture({
    authReady,
    userSub,
    activePortfolioId,
    portfolioReady,
    holdings,
    pricesSettled,
    isRefreshing,
    manualRefreshGeneration,
    accessReady: productAccess.accessReady,
    isDemo: productAccess.isDemo,
  });

  const accessReady = productAccess.accessReady;
  const changeIntelligence = useChangeIntelligence({
    enabled:
      accessReady &&
      portfolioReady &&
      Boolean(userSub) &&
      holdings.length > 0,
    isDemo: productAccess.isDemo,
    dashboardCapture:
      !accessReady || productAccess.isDemo || !portfolioReady
        ? null
        : {
            holdings,
            goal,
            hasSavedGoal,
          },
  });

  const smartAlertsMode = resolveSmartAlertsAccessMode(productAccess);
  const holdingNewsItems = useMemo(
    () => [...(payload.portfolioNews ?? []), ...(payload.macroNews ?? [])],
    [payload.macroNews, payload.portfolioNews],
  );

  const portfolioChangeAttention = useMemo(() => {
    if (!accessReady || holdings.length === 0) return null;
    return applyPortfolioChangeAccess(
      buildPortfolioChangeAttention({
        holdings,
        goal,
        hasSavedGoal,
        snapshots: changeIntelligence.snapshots,
        newsItems: holdingNewsItems,
        isDemo: productAccess.isDemo,
      }),
      smartAlertsMode,
    );
  }, [
    changeIntelligence.snapshots,
    goal,
    hasSavedGoal,
    holdings,
    holdingNewsItems,
    accessReady,
    productAccess.isDemo,
    smartAlertsMode,
  ]);

  const lookingAhead = useMemo(() => {
    if (!accessReady || holdings.length === 0) return null;
    return buildLookingAhead({
      holdings,
      allocation: exposureAllocation,
      resilience: resilienceProfile,
      upcomingEvents: payload.upcomingEvents,
      intelligenceDepth: productAccess.intelligenceDepth,
    });
  }, [
    accessReady,
    exposureAllocation,
    holdings,
    payload.upcomingEvents,
    productAccess.intelligenceDepth,
    resilienceProfile,
  ]);

  const personalIntelligence = useMemo(
    () =>
      selectDashboardPersonalIntelligence({
        changeAttention: portfolioChangeAttention,
        lookingAhead,
      }),
    [lookingAhead, portfolioChangeAttention],
  );

  const exampleActive = useExampleActiveStatus(
    portfolioReady && Boolean(userSub),
  );

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <PageContainer canvas="dashboard">
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

          {accessReady ? (
            <>
              <DashboardFirstRunCue
                userSub={userSub}
                exampleActive={exampleActive}
              />

              <FirstIntelligenceMoment
                userSub={userSub}
                hasHoldings={holdings.length > 0}
                exampleActive={exampleActive}
                hasSavedGoal={hasSavedGoal}
              />
            </>
          ) : null}

          {exampleActive && accessReady ? (
            <>
              <DemoHoldingsCallout
                exampleActive={exampleActive}
                holdings={holdings}
              />
              <TrialStepsCard />
            </>
          ) : null}

          <DashboardSummary
            snapshot={snapshot}
            smart={smartDashboard}
            weekPerformancePoints={weekHistory.data?.chartPoints ?? null}
            monthPerformancePoints={monthHistory.data?.chartPoints ?? null}
            refresh={{
              onRefresh: () => void refreshPrices(),
              isRefreshing,
              disabled: refreshDisabled,
              status: refreshStatus,
              message: refreshMessage,
              liveRefreshAt,
              displayFreshnessAt,
            }}
          />

          <DashboardGoalProgressStrip
            progress={goalProgress}
            hasSavedGoal={hasSavedGoal}
            targetYear={goal?.targetYear ?? null}
            monthHistory={monthHistory.data}
            yearHistory={yearHistory.data}
            allHistory={allHistory.data}
            historyReady={historyEnabled}
            monthHistoryLoading={monthHistory.isLoading}
            yearHistoryLoading={yearHistory.isLoading}
            allHistoryLoading={allHistory.isLoading}
          />

          <HoldingsToday
            snapshot={snapshot}
            holdings={holdings}
            newsItems={holdingNewsItems}
          />

          {accessReady ? (
            <>
              <CompleteTrialIndicator access={productAccess} />
              <FreeIntelligenceNote access={productAccess} />
              <DashboardPersonalIntelligence view={personalIntelligence} />
            </>
          ) : (
            <section
              className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 sm:px-5"
              data-testid="dashboard-access-pending"
              aria-busy="true"
              aria-label="Updating plan"
            >
              <p className="text-[14px] leading-6 text-white/55">
                Updating your plan…
              </p>
            </section>
          )}

          <DashboardSecondaryNav />
        </>
      ) : null}

      <p className="px-1 pb-2 text-center text-[13px] leading-[1.7] text-white/40">
        Tobailey is a monitoring tool. It does not provide personal financial
        advice.
      </p>
    </PageContainer>
  );
}
