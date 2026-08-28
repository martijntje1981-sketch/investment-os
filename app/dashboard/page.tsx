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
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useAfterFirstPaint } from "@/lib/client/useAfterFirstPaint";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildSmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import { selectDashboardPersonalIntelligence } from "@/lib/client/dashboardPersonalIntelligence";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { buildResilienceProfile } from "@/lib/services/resilience";
import {
  buildPortfolioPerformanceAttribution,
  buildPulseAttributionEnrichment,
} from "@/lib/services/performanceAttribution";
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
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export default function DashboardPage() {
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
    displayFreshnessAt,
    disabled: refreshDisabled,
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

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const marketsClosed = useMemo(() => areMajorMarketsClosed(), []);

  const resilienceProfile = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });
  }, [goal, hasSavedGoal, holdings]);

  const portfolioPulse = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildPortfolioPulse({
      daily: {
        holdings,
        marketsClosed,
        href: "/review",
      },
      weekly: {
        week: weekHistory.data,
        month: monthHistory.data,
        href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      },
      monthly: {
        month: monthHistory.data,
        week: weekHistory.data,
        resilienceScore: resilienceProfile?.score ?? null,
        largestHoldingWeightPercent:
          snapshot.concentrationWeightPercent ?? null,
        goalStatus: goalProgress.hasGoal ? goalProgress.status : null,
        hasSavedGoal: goalProgress.hasGoal,
        href: DASHBOARD_DEEP_LINKS.resilienceSleep,
      },
    });
  }, [
    goalProgress.hasGoal,
    goalProgress.status,
    holdings,
    marketsClosed,
    monthHistory.data,
    resilienceProfile?.score,
    snapshot.concentrationWeightPercent,
    weekHistory.data,
  ]);

  const pulseAttributionEnrichment = useMemo(() => {
    if (holdings.length === 0) return null;

    const dailyAttr = buildPortfolioPerformanceAttribution({
      period: "1D",
      holdings,
    });
    const weeklyAttr = weekHistory.data?.holdingMoves
      ? buildPortfolioPerformanceAttribution({
          period: "1W",
          holdings,
          holdingMoves: weekHistory.data.holdingMoves,
          startingPortfolioValue: weekHistory.data.startingValue,
          endingPortfolioValue: weekHistory.data.endingValue,
          totalReturnPercent: weekHistory.data.investmentReturnPercent,
          totalReturnAmount: weekHistory.data.investmentReturn,
          historicalFxApproximate: weekHistory.data.historicalFxApproximate,
        })
      : null;
    const monthlyAttr = monthHistory.data?.holdingMoves
      ? buildPortfolioPerformanceAttribution({
          period: "1M",
          holdings,
          holdingMoves: monthHistory.data.holdingMoves,
          startingPortfolioValue: monthHistory.data.startingValue,
          endingPortfolioValue: monthHistory.data.endingValue,
          totalReturnPercent: monthHistory.data.investmentReturnPercent,
          totalReturnAmount: monthHistory.data.investmentReturn,
          historicalFxApproximate: monthHistory.data.historicalFxApproximate,
        })
      : null;

    return {
      daily: buildPulseAttributionEnrichment(dailyAttr),
      weekly: buildPulseAttributionEnrichment(weeklyAttr),
      monthly: buildPulseAttributionEnrichment(monthlyAttr),
    };
  }, [holdings, weekHistory.data, monthHistory.data]);

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

  const changeIntelligence = useChangeIntelligence({
    enabled: portfolioReady && Boolean(userSub) && holdings.length > 0,
    isDemo: productAccess.isDemo,
    dashboardCapture:
      productAccess.isDemo || !portfolioReady
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
    if (holdings.length === 0) return null;
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
    productAccess.isDemo,
    smartAlertsMode,
  ]);

  const lookingAhead = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildLookingAhead({
      holdings,
      allocation: exposureAllocation,
      resilience: resilienceProfile,
      upcomingEvents: payload.upcomingEvents,
      intelligenceDepth: productAccess.intelligenceDepth,
    });
  }, [
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

  if (!portfolioReady || (Boolean(userSub) && !productAccess.accessReady)) {
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

          <FirstIntelligenceMoment
            userSub={userSub}
            hasHoldings={holdings.length > 0}
            exampleActive={exampleActive}
            hasSavedGoal={hasSavedGoal}
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

          <DashboardSummary
            snapshot={snapshot}
            pulse={portfolioPulse}
            smart={smartDashboard}
            weekPerformancePoints={weekHistory.data?.chartPoints ?? null}
            monthPerformancePoints={monthHistory.data?.chartPoints ?? null}
            pulseAttributionEnrichment={pulseAttributionEnrichment}
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

          <HoldingsToday
            snapshot={snapshot}
            holdings={holdings}
            newsItems={holdingNewsItems}
          />

          <CompleteTrialIndicator access={productAccess} />
          <FreeIntelligenceNote access={productAccess} />
          <DashboardPersonalIntelligence view={personalIntelligence} />

          <DashboardSecondaryNav />
        </>
      ) : null}

      <p className="rounded-[28px] border border-slate-200/70 bg-white/95 px-5 py-5 text-center text-[13px] leading-[1.7] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 sm:text-sm">
        Tobailey is a monitoring tool. It does not provide personal financial
        advice.
      </p>
    </PageContainer>
  );
}
