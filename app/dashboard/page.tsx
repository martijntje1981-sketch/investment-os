"use client";

import { useMemo } from "react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardCashIntelligenceCard } from "@/components/dashboard/DashboardCashIntelligenceCard";
import { DashboardMarketPulseCard } from "@/components/dashboard/DashboardMarketPulseCard";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DashboardExploreTools } from "@/components/dashboard/DashboardExploreTools";
import { DashboardPortfolioHistorySection } from "@/components/dashboard/DashboardPortfolioHistorySection";
import { FourQuestionsSection } from "@/components/dashboard/fourQuestions/FourQuestionsSection";
import { SinceLastCheckSection } from "@/components/dashboard/SinceLastCheckSection";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import { DashboardFirstRunCue } from "@/components/dashboard/DashboardFirstRunCue";
import { FirstIntelligenceMoment } from "@/components/onboarding/FirstIntelligenceMoment";
import { DemoHoldingsCallout } from "@/components/example/DemoHoldingsCallout";
import { TrialStepsCard } from "@/components/example/TrialStepsCard";
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
} from "@/lib/client/portfolioAnalysis";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePerspectivesFeed } from "@/lib/client/usePerspectivesFeed";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useMarketSnapshotMetadata } from "@/lib/client/useMarketSnapshotMetadata";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useAfterFirstPaint } from "@/lib/client/useAfterFirstPaint";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { buildSmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { buildResilienceProfile } from "@/lib/services/resilience";
import {
  buildPortfolioPerformanceAttribution,
  buildPulseAttributionEnrichment,
} from "@/lib/services/performanceAttribution";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useChangeIntelligence } from "@/lib/client/useChangeIntelligence";
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
    disabled: refreshDisabled,
  } = useLivePortfolioPriceRefresh({
    userSub,
    holdings,
    saveHoldings,
    ready: portfolioReady,
    idleMessage: "Dashboard prices use the latest available market data.",
  });
  const { goal, hasSavedGoal } = useUserGoal();

  // Product-level scope foundation — current app defaults to complete.
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
  const { realityCheck } = useGoalRealityCheck(
    scopedHoldings,
    goal,
    historyEnabled && scopedHoldings.length > 0 && hasSavedGoal,
  );

  const {
    intelligence,
    payload,
  } = useInvestmentIntelligence(holdings, userSub, holdings.length > 0);
  const perspectivesHoldingsKey = useMemo(
    () =>
      holdings
        .map((holding) => holding.symbol)
        .sort()
        .join("|"),
    [holdings],
  );
  const perspectivesFeed = usePerspectivesFeed(perspectivesHoldingsKey);
  const { lastRefreshedAt: snapshotRefreshedAt } = useMarketSnapshotMetadata(
    portfolioReady && holdings.length > 0,
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

  /** Four Questions — depth from central product access (Free vs Complete). */
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
  const portfolioChangeAttention = useMemo(() => {
    if (holdings.length === 0) return null;
    return applyPortfolioChangeAccess(
      buildPortfolioChangeAttention({
        holdings,
        goal,
        hasSavedGoal,
        snapshots: changeIntelligence.snapshots,
        newsItems: [
          ...(payload.portfolioNews ?? []),
          ...(payload.macroNews ?? []),
        ],
        isDemo: productAccess.isDemo,
      }),
      smartAlertsMode,
    );
  }, [
    changeIntelligence.snapshots,
    goal,
    hasSavedGoal,
    holdings,
    payload.macroNews,
    payload.portfolioNews,
    productAccess.isDemo,
    smartAlertsMode,
  ]);

  const fourQuestions = useMemo(() => {
    if (holdings.length === 0) return null;
    const nextEvent = payload.upcomingEvents?.[0];
    const nextEventLabel = nextEvent?.title?.trim() || null;
    return buildFourQuestions({
      holdings,
      preferredScope: intelligenceScope,
      intelligenceDepth: productAccess.intelligenceDepth,
      goal,
      hasSavedGoal,
      goalProgress,
      realityCheck,
      intelligence,
      newsItems: [
        ...(payload.portfolioNews ?? []),
        ...(payload.macroNews ?? []),
      ],
      perspectiveVideos: perspectivesFeed.videos,
      pulse: portfolioPulse,
      nextEventLabel,
      nextEventHref: nextEventLabel ? "/events" : null,
      changeIntelligence: changeIntelligence.summary,
      portfolioChangeAttention,
    });
  }, [
    changeIntelligence.summary,
    goal,
    goalProgress,
    hasSavedGoal,
    holdings,
    intelligence,
    intelligenceScope,
    payload.macroNews,
    payload.portfolioNews,
    payload.upcomingEvents,
    perspectivesFeed.videos,
    portfolioChangeAttention,
    portfolioPulse,
    productAccess.intelligenceDepth,
    realityCheck,
  ]);

  const exampleActive = useExampleActiveStatus(
    portfolioReady && Boolean(userSub),
  );

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

          {/* 1. Dashboard Hero (+ Smart Hero 2.0 / Daily Portfolio Briefing) */}
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
            }}
          />

          {fourQuestions ? (
            <>
              <CompleteTrialIndicator access={productAccess} />
              <FreeIntelligenceNote access={productAccess} />
              {portfolioChangeAttention ? (
                <SinceLastCheckSection
                  attention={portfolioChangeAttention}
                  accessMode={smartAlertsMode}
                  userSub={userSub}
                />
              ) : null}
              <FourQuestionsSection
                bundle={fourQuestions}
                intelligenceDepth={productAccess.intelligenceDepth}
              />
            </>
          ) : null}

          <AuthenticatedFourQuestionsNav className="mt-1" />

          <HoldingsToday snapshot={snapshot} />

          <div
            className="space-y-3 opacity-90 md:space-y-4 md:opacity-95"
            data-testid="dashboard-secondary-modules"
            data-zone="explore-more"
          >
            {/* Zone 4 — Explore More: quieter, compact previews */}
            <DashboardMarketPulseCard
              holdings={holdings}
              leadLabel={
                portfolioHealthProfile.classification.cryptoWeight >= 20
                  ? "Bitcoin and linked markets may be moving with your portfolio."
                  : "See commodities, crypto and markets connected to your holdings."
              }
            />

            <DashboardPerspectivesWidget />

            <DashboardCashIntelligenceCard holdings={holdings} />

            <DashboardPortfolioHistorySection
              holdings={holdings}
              history={monthHistory.data}
              portfolioValue={snapshot.portfolioValue}
              portfolioValueAvailable={snapshot.portfolioValueAvailable}
              emphasisNote={smartDashboard.emphasis.historyNote}
            />

            <DashboardPortfolioExposureCard
              allocation={exposureAllocation}
              scenarioResults={resilienceProfile?.scenarioResults ?? null}
            />

            <DashboardExploreTools
              emphasizeGoals={smartDashboard.emphasis.exploreGoalsHighlight}
            />

            <DashboardMarketStatus lastUpdatedAt={marketUpdatedAt} />
          </div>
        </>
      ) : null}

      <p className="rounded-[28px] border border-slate-200/70 bg-white/95 px-5 py-5 text-center text-[13px] leading-[1.7] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 sm:text-sm">
        Tobailey is a monitoring tool. It does not provide personal financial
        advice.
      </p>
    </PageContainer>
  );
}
