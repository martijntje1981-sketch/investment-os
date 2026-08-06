"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import BottomNavigation from "@/components/home/BottomNav";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  CompanionEmptyTrialState,
  CompanionReviewPanel,
} from "@/components/companion/CompanionReviewPanel";
import { CompanionPeriodTabs } from "@/components/companion/CompanionPeriodTabs";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import {
  buildCompanionBundle,
  type CompanionPeriod,
} from "@/lib/services/portfolio/companion";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { useExampleActiveStatus } from "@/lib/client/useExampleActiveStatus";

function parsePeriodParam(value: string | null): CompanionPeriod | null {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  if (value === "today") return "daily";
  if (value === "week") return "weekly";
  if (value === "month") return "monthly";
  return null;
}

function CompanionReviewContent() {
  const searchParams = useSearchParams();
  const { formatEur } = useBaseCurrencyDisplay();
  const {
    userSub,
    holdings,
    portfolioReady,
    syncState,
  } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );
  const weekHistory = usePortfolioPerformanceHistory(holdings, "1W");
  const monthHistory = usePortfolioPerformanceHistory(holdings, "1M");
  const contributions = usePortfolioContributions(
    snapshot.portfolioValue,
    snapshot.portfolioValueAvailable,
    holdings.length > 0,
    holdings,
  );
  const exampleActive = useExampleActiveStatus(
    portfolioReady && Boolean(userSub),
  );

  const emptySetup = needsPortfolioSetup({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
    portfolioReady,
    syncLoading: syncState.status === "loading",
  });

  const bundle = useMemo(() => {
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

    const weakest =
      snapshot.hasReliableHeroMoverData && snapshot.heroLowestMover
        ? snapshot.heroLowestMover.holding.name ||
          snapshot.heroLowestMover.holding.symbol
        : null;

    return buildCompanionBundle({
      holdingCount: holdings.length,
      isDemo: Boolean(exampleActive),
      formatMoney: formatEur,
      hasDailyData: snapshot.hasDailyData,
      todayChange: snapshot.todayChange,
      todayPercent: snapshot.todayPercent,
      usesPreviousClose,
      previousClosePhrase: previousClosePhraseFromContextLine(
        snapshot.dailyMoveContextLine,
      ),
      strongestContributorName: ledByName,
      weakestContributorName: weakest,
      weekSeries: weekHistory.data?.chartPoints ?? null,
      monthSeries: monthHistory.data?.chartPoints ?? null,
      contributionEntries: contributions.entries,
      hasSavedGoal,
      goalStatus: goalProgress.status,
      goalProgressPercent: goalProgress.hasGoal
        ? goalProgress.currentProgressPercent
        : null,
      goalReached: goalProgress.goalReached,
      concentrationWeightPercent: snapshot.concentrationWeightPercent,
      historyMonthsAvailable:
        monthHistory.data?.chartPoints &&
        monthHistory.data.chartPoints.length >= 2
          ? Math.max(
              1,
              Math.round(monthHistory.data.chartPoints.length / 21),
            )
          : null,
    });
  }, [
    contributions.entries,
    exampleActive,
    formatEur,
    goalProgress.currentProgressPercent,
    goalProgress.goalReached,
    goalProgress.hasGoal,
    goalProgress.status,
    hasSavedGoal,
    holdings.length,
    monthHistory.data,
    snapshot,
    weekHistory.data,
  ]);

  const requested = parsePeriodParam(searchParams.get("period"));
  const [period, setPeriod] = useState<CompanionPeriod>(
    () => requested ?? bundle.defaultPeriod,
  );

  const activePeriod = requested ?? period;
  const review =
    activePeriod === "weekly"
      ? bundle.weekly
      : activePeriod === "monthly"
        ? bundle.monthly
        : bundle.daily;

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <PageHero
          title="Your Review"
          subtitle="What happened, what mattered, and how your portfolio progressed — in about 30 seconds."
          backToDashboard
        />

        {emptySetup ? (
          <CompanionEmptyTrialState />
        ) : (
          <div className="space-y-5">
            <CompanionPeriodTabs
              value={activePeriod}
              onChange={(next) => {
                setPeriod(next);
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("period", next);
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              readiness={{
                daily: bundle.daily.ready,
                weekly: bundle.weekly.ready,
                monthly: bundle.monthly.ready,
              }}
            />

            <div
              role="tabpanel"
              id={`companion-panel-${activePeriod}`}
              aria-labelledby={`companion-tab-${activePeriod}`}
            >
              <CompanionReviewPanel review={review} />
            </div>
          </div>
        )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

export default function CompanionReviewPage() {
  return (
    <Suspense fallback={<AppPageLoading />}>
      <CompanionReviewContent />
    </Suspense>
  );
}
