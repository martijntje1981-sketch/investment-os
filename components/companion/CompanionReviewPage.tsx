"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import {
  CompanionEmptyTrialState,
  CompanionReviewPanel,
} from "@/components/companion/CompanionReviewPanel";
import { CompanionPeriodTabs } from "@/components/companion/CompanionPeriodTabs";
import { MonthlyReviewArchive } from "@/components/companion/MonthlyReviewArchive";
import { PeriodReviewEmailPreferences } from "@/components/companion/PeriodReviewEmailPreferences";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
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
  type CompanionReview,
} from "@/lib/services/portfolio/companion";
import { needsPortfolioSetup } from "@/lib/client/portfolioSetup";
import { useExampleActiveStatus } from "@/lib/client/useExampleActiveStatus";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useChangeIntelligence } from "@/lib/client/useChangeIntelligence";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence";
import {
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
} from "@/lib/services/periodIntelligence";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { MonthlyReviewArchiveItem } from "@/lib/services/portfolio/companion/snapshotTypes";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { PeriodReportPdfAction } from "@/components/report/PeriodReportPdfAction";

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
  const { formatEur, baseCurrency, convertEur } = useBaseCurrencyDisplay();
  const { userSub, holdings, portfolioReady, syncState } = useUserPortfolio();
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
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));

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
          ? Math.max(1, Math.round(monthHistory.data.chartPoints.length / 21))
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

  const weeklyPulse = useMemo(() => {
    if (holdings.length === 0) return null;
    const pulse = buildPortfolioPulse({
      daily: {
        holdings,
        marketsClosed: areMajorMarketsClosed(),
        href: "/market-pulse",
      },
      weekly: {
        week: weekHistory.data,
        month: monthHistory.data,
        href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      },
    });
    if (!pulse?.weekly?.available || pulse.weekly.value == null) return null;
    return {
      score: pulse.weekly.value,
      bandLabel: pulse.weekly.band?.label ?? "Pulse",
    };
  }, [holdings, monthHistory.data, weekHistory.data]);

  const requested = parsePeriodParam(searchParams.get("period"));
  const monthParam = searchParams.get("month");
  const [period, setPeriod] = useState<CompanionPeriod>(
    () => requested ?? bundle.defaultPeriod,
  );
  const [archive, setArchive] = useState<MonthlyReviewArchiveItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [savedReview, setSavedReview] = useState<CompanionReview | null>(null);

  const activePeriod = requested ?? period;

  const changeIntelligence = useChangeIntelligence({
    enabled: Boolean(userSub) && holdings.length > 0 && !emptySetup,
    isDemo: Boolean(exampleActive) || productAccess.isDemo,
    preferredKind:
      activePeriod === "weekly" || activePeriod === "monthly"
        ? activePeriod
        : null,
    capture:
      exampleActive || productAccess.isDemo
        ? null
        : {
            holdings,
            goal,
            hasSavedGoal,
            weeklyReady: bundle.weekly.ready,
            monthlyReady: bundle.monthly.ready,
            monthlyPeriodKind: bundle.monthly.periodKind,
          },
  });

  useEffect(() => {
    if (activePeriod !== "monthly" || !userSub || exampleActive) return;
    let active = true;
    setArchiveLoading(true);
    void fetch("/api/review/monthly", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: MonthlyReviewArchiveItem[];
        };
        if (!active) return;
        setArchive(payload.items ?? []);
      })
      .catch(() => {
        if (!active) return;
        setArchive([]);
      })
      .finally(() => {
        if (active) setArchiveLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activePeriod, exampleActive, userSub]);

  // Persist completed calendar monthly review when ready (idempotent).
  useEffect(() => {
    if (
      activePeriod !== "monthly" ||
      !bundle.monthly.ready ||
      bundle.monthly.periodKind !== "calendar_month" ||
      bundle.monthly.isDemo ||
      !userSub
    ) {
      return;
    }
    void fetch("/api/review/monthly", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review: bundle.monthly,
        metrics: bundle.monthly.metrics,
        baseCurrency,
      }),
    }).then(() => {
      void fetch("/api/review/monthly", { credentials: "same-origin" })
        .then(async (response) => {
          const payload = (await response.json()) as {
            items?: MonthlyReviewArchiveItem[];
          };
          setArchive(payload.items ?? []);
        })
        .catch(() => undefined);
    });
  }, [
    activePeriod,
    baseCurrency,
    bundle.monthly,
    userSub,
  ]);

  // Load historic saved month when ?month=YYYY-MM
  useEffect(() => {
    if (activePeriod !== "monthly" || !monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      setSavedReview(null);
      return;
    }
    let active = true;
    void fetch(`/api/review/monthly/${monthParam}`, {
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          snapshot?: { payload?: { review?: CompanionReview } };
        };
        if (!active) return;
        setSavedReview(payload.snapshot?.payload?.review ?? null);
      })
      .catch(() => {
        if (active) setSavedReview(null);
      });
    return () => {
      active = false;
    };
  }, [activePeriod, monthParam]);

  const liveReview =
    activePeriod === "weekly"
      ? bundle.weekly
      : activePeriod === "monthly"
        ? bundle.monthly
        : bundle.daily;

  const review =
    activePeriod === "monthly" && savedReview ? savedReview : liveReview;

  const resilienceProfile = useMemo(() => {
    if (holdings.length === 0) return null;
    return buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });
  }, [goal, hasSavedGoal, holdings]);

  const periodIntelligence = useMemo(() => {
    if (activePeriod !== "weekly" && activePeriod !== "monthly") return null;
    const isArchiveMonth = Boolean(savedReview);
    const history =
      activePeriod === "weekly" ? weekHistory.data : monthHistory.data;
    const built = buildPeriodIntelligenceReview({
      kind: activePeriod,
      companion: review,
      change: isArchiveMonth
        ? summarizeStoredChangeIntelligence([])
        : changeIntelligence.summary,
      snapshotCount: isArchiveMonth ? 0 : changeIntelligence.snapshotCount,
      intelligenceDepth: "complete",
      weeklyPulse:
        activePeriod === "weekly" && !isArchiveMonth ? weeklyPulse : null,
      concentrationWeightPercent: isArchiveMonth
        ? null
        : snapshot.concentrationWeightPercent,
      largestHoldingName: isArchiveMonth
        ? null
        : snapshot.concentrationSymbol ??
          snapshot.heroTopMover?.holding.name ??
          snapshot.topDailyDriver?.name ??
          null,
      resilienceProfile: isArchiveMonth ? null : resilienceProfile,
      holdings: isArchiveMonth ? [] : holdings,
      goal: isArchiveMonth ? null : goal,
      hasSavedGoal: isArchiveMonth ? false : hasSavedGoal,
      contributionEntries: isArchiveMonth ? [] : contributions.entries,
      chartPoints: isArchiveMonth ? null : history?.chartPoints ?? null,
      holdingMoves: isArchiveMonth ? null : history?.holdingMoves ?? null,
      startingPortfolioValue: isArchiveMonth
        ? null
        : history?.startingValue ?? null,
      endingPortfolioValue: isArchiveMonth
        ? null
        : history?.endingValue ?? null,
      currentPortfolioValue: isArchiveMonth
        ? null
        : snapshot.portfolioValueAvailable
          ? snapshot.portfolioValue
          : null,
      totalReturnPercent: isArchiveMonth
        ? null
        : history?.investmentReturnPercent ?? null,
      totalReturnAmount: isArchiveMonth
        ? null
        : history?.investmentReturn ?? null,
      historicalFxApproximate: isArchiveMonth
        ? false
        : Boolean(history?.historicalFxApproximate),
      now: new Date(),
    });
    return applyPeriodIntelligenceDepth(
      built,
      productAccess.intelligenceDepth,
    );
  }, [
    activePeriod,
    changeIntelligence.snapshotCount,
    changeIntelligence.summary,
    holdings,
    productAccess.intelligenceDepth,
    resilienceProfile,
    review,
    savedReview,
    snapshot,
    weeklyPulse,
    contributions.entries,
    weekHistory.data,
    monthHistory.data,
    goal,
    hasSavedGoal,
  ]);

  function handleExport() {
    return runPortfolioExport({
      holdings,
      entries: contributions.entries,
      portfolioValueEur: snapshot.portfolioValue,
      portfolioValueAvailable: snapshot.portfolioValueAvailable,
      baseCurrency,
      convertEur,
      chartPoints: monthHistory.data?.chartPoints ?? null,
      goal,
      hasSavedGoal,
    });
  }

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <PageHero
          title="Your Review"
          subtitle={
            activePeriod === "weekly" || activePeriod === "monthly"
              ? "Your personal investment review"
              : "What happened, what mattered, and how your portfolio progressed."
          }
          backToDashboard
          actions={
            <div
              data-testid="review-hero-actions"
              className="flex w-full min-w-0 flex-col gap-2 lg:w-[17.5rem]"
            >
              {activePeriod === "weekly" || activePeriod === "monthly" ? (
                <PeriodReportPdfAction
                  review={periodIntelligence}
                  access={productAccess}
                  archiveYearMonth={savedReview ? monthParam : null}
                  variant="hero"
                />
              ) : null}
              <ExportPortfolioButton
                onExport={handleExport}
                variant="hero"
                className="w-full"
              />
            </div>
          }
        />

        <AuthenticatedFourQuestionsNav />

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
                  if (next !== "monthly") url.searchParams.delete("month");
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              readiness={{
                daily: bundle.daily.ready,
                weekly: bundle.weekly.ready,
                monthly: bundle.monthly.ready || archive.length > 0,
              }}
            />

            <div
              role="tabpanel"
              id={`companion-panel-${activePeriod}`}
              aria-labelledby={`companion-tab-${activePeriod}`}
            >
              <CompanionReviewPanel
                review={review}
                weeklyPulse={
                  activePeriod === "weekly" && !savedReview
                    ? weeklyPulse
                    : null
                }
                changeIntelligence={changeIntelligence.summary}
                changeFirstHistoryCopy={changeIntelligence.firstHistoryCopy}
                intelligenceDepth={productAccess.intelligenceDepth}
                periodIntelligence={periodIntelligence}
              />
            </div>

            {activePeriod === "weekly" || activePeriod === "monthly" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/portfolio-history"
                  className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-brand-navy underline-offset-2 hover:underline"
                >
                  Open Portfolio History
                </Link>
              </div>
            ) : null}

            {activePeriod === "weekly" || activePeriod === "monthly" ? (
              <PeriodReviewEmailPreferences
                access={productAccess}
                disabledForDemo={Boolean(exampleActive)}
              />
            ) : null}

            {activePeriod === "monthly" ? (
              <MonthlyReviewArchive
                items={archive}
                selectedYearMonth={monthParam}
                loading={archiveLoading}
              />
            ) : null}
          </div>
        )}
      </PageContainer>
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
