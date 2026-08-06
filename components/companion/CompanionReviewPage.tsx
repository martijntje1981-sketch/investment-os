"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
import { MonthlyReviewArchive } from "@/components/companion/MonthlyReviewArchive";
import { MonthlyReviewEmailToggle } from "@/components/companion/MonthlyReviewEmailToggle";
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
import type { MonthlyReviewArchiveItem } from "@/lib/services/portfolio/companion/snapshotTypes";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { appGhostButtonClass } from "@/components/layout/appSurface";

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

  const requested = parsePeriodParam(searchParams.get("period"));
  const monthParam = searchParams.get("month");
  const [period, setPeriod] = useState<CompanionPeriod>(
    () => requested ?? bundle.defaultPeriod,
  );
  const [archive, setArchive] = useState<MonthlyReviewArchiveItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [savedReview, setSavedReview] = useState<CompanionReview | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const activePeriod = requested ?? period;

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

  function handleExport() {
    runPortfolioExport({
      holdings,
      entries: contributions.entries,
      portfolioValueEur: snapshot.portfolioValue,
      portfolioValueAvailable: snapshot.portfolioValueAvailable,
      baseCurrency,
      convertEur,
      chartPoints: monthHistory.data?.chartPoints ?? null,
      goal,
      hasSavedGoal,
      review: bundle.monthly.ready
        ? bundle.monthly
        : bundle.weekly.ready
          ? bundle.weekly
          : null,
    });
  }

  async function handlePdf() {
    setPdfError(null);
    const yearMonth =
      monthParam ||
      (review.startDate ? review.startDate.slice(0, 7) : null);
    if (!yearMonth) {
      setPdfError("Save a completed monthly review before downloading a PDF.");
      return;
    }
    try {
      const response = await fetch(`/api/review/monthly/${yearMonth}/pdf`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setPdfError(
          payload?.error ??
            "The PDF could not be created. Your review is still available here.",
        );
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Tobailey_Monthly_Review_${yearMonth}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(
        "The PDF could not be created. Your review is still available here.",
      );
    }
  }

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <PageHero
          title="Your Review"
          subtitle="What happened, what mattered, and how your portfolio progressed."
          backToDashboard
          actions={
            <ExportPortfolioButton onExport={() => void handleExport()} />
          }
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
              <CompanionReviewPanel review={review} />
            </div>

            {activePeriod === "weekly" || activePeriod === "monthly" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ExportPortfolioButton
                  onExport={() => void handleExport()}
                  variant="ghost"
                />
                {activePeriod === "monthly" && review.ready ? (
                  <button
                    type="button"
                    onClick={() => void handlePdf()}
                    className={appGhostButtonClass}
                  >
                    Download PDF
                  </button>
                ) : null}
                <Link
                  href="/portfolio-history"
                  className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
                >
                  Open Portfolio History
                </Link>
              </div>
            ) : null}

            {pdfError ? (
              <p className="text-sm font-semibold text-rose-700" role="alert">
                {pdfError}
              </p>
            ) : null}

            {activePeriod === "monthly" ? (
              <>
                <MonthlyReviewArchive
                  items={archive}
                  selectedYearMonth={monthParam}
                  loading={archiveLoading}
                />
                <MonthlyReviewEmailToggle disabledForDemo={Boolean(exampleActive)} />
              </>
            ) : null}
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
