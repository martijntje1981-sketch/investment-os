"use client";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { HeroPerformanceSparkline } from "@/components/dashboard/HeroPerformanceSparkline";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import { resolvePortfolioDisplayFreshness } from "@/lib/client/portfolioDisplayFreshness";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { SmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import {
  appDashboardDarkMetaClass,
  appDashboardHeroShellClass,
  appDisplayClass,
  appHeroMatchedKpiClass,
  appHeroMetricLabelClass,
  appHeroPaddingCompactClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { presentDashboardValuationCoverageMessage } from "@/lib/client/portfolioValuationCoverage";

function moveToneClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData) {
    return "text-white";
  }
  if (snapshot.todayChange > 0) {
    return "text-emerald-400";
  }
  if (snapshot.todayChange < 0) {
    return "text-rose-400";
  }
  return "text-white";
}

function sparklineTone(
  snapshot: DashboardPortfolioSnapshot,
): "positive" | "negative" | "neutral" {
  if (!snapshot.hasDailyData) return "neutral";
  if (snapshot.todayPercent > 0) return "positive";
  if (snapshot.todayPercent < 0) return "negative";
  return "neutral";
}

/**
 * Compact Dashboard hero: value, latest move, freshness, trend, chart.
 * Pulse, movers, and briefing stay available through Explore Tobailey.
 */
export function PortfolioValueCard({
  snapshot,
  refresh,
  smart,
  performancePoints = null,
  weekPerformancePoints = null,
  monthPerformancePoints = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  smart: SmartDashboardIntelligence;
  /** @deprecated Prefer weekPerformancePoints + monthPerformancePoints. */
  performancePoints?: PortfolioPerformancePoint[] | null;
  weekPerformancePoints?: PortfolioPerformancePoint[] | null;
  monthPerformancePoints?: PortfolioPerformancePoint[] | null;
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
    disabled?: boolean;
    status?: RefreshPricesUiStatus;
    message?: string | null;
    liveRefreshAt?: string | null;
    displayFreshnessAt?: string | null;
  };
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const showMove = snapshot.hasDailyData;
  const moveTone = moveToneClass(snapshot);
  const usesPreviousClose =
    Boolean(snapshot.isStale) ||
    /previous|market close|latest available/i.test(
      snapshot.dailyMoveContextLine,
    );
  const previousClosePhrase = previousClosePhraseFromContextLine(
    snapshot.dailyMoveContextLine,
  );

  const amountLabel = showMove
    ? formatSignedPortfolioCurrency(snapshot.todayChange, formatEur)
    : "—";
  const percentLabel = showMove
    ? formatSignedPortfolioPercent(snapshot.todayPercent)
    : null;

  const freshness = resolvePortfolioDisplayFreshness({
    displayFreshnessAt: refresh?.displayFreshnessAt,
    legacyLiveRefreshAt: refresh?.liveRefreshAt,
  });
  const updatedLabel = freshness.label;

  const coverageAppendix =
    snapshot.dailyPerformanceCoverageMessage &&
    snapshot.performanceCoverageComplete === false
      ? snapshot.dailyPerformanceCoverageMessage
      : null;

  const priceBasisLabel = showMove
    ? [
        usesPreviousClose
          ? previousClosePhrase
            ? `Based on ${previousClosePhrase}`
            : "Based on the previous market close"
          : snapshot.dailyMoveContextLine,
        coverageAppendix,
      ]
        .filter(Boolean)
        .join(" · ")
    : (snapshot.dailyPerformanceCoverageMessage ??
      "Movement period unavailable");

  const isStaleDisplay = Boolean(snapshot.isStale && !refresh?.liveRefreshAt);
  const heroElevated = smart.emphasis.heroElevated;
  const marketRows = snapshot.marketHoldings.filter(
    (row) => row.assetType !== "cash",
  );
  const presentedCoverageMessage = presentDashboardValuationCoverageMessage({
    coverageMessage: snapshot.portfolioValueCoverageMessage,
    priceQualities: marketRows.map((row) => row.priceQuality),
    pricesInitializing:
      refresh?.isRefreshing === true || refresh?.status === "loading",
    hasSettledMarketTimestamp: marketRows.some((row) =>
      Boolean(row.marketPriceUpdatedAt || row.priceUpdatedAt),
    ),
  });

  return (
    <article
      aria-label="Portfolio value"
      className={`relative overflow-hidden ${appDashboardHeroShellClass}`}
      data-testid="dashboard-portfolio-hero"
      data-hero-emphasis={heroElevated ? "elevated" : "default"}
      data-hero-scenario={smart.scenario}
    >
      <div
        className={`relative min-w-0 ${appHeroPaddingCompactClass}`}
        data-testid="hero-zone-primary"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={appHeroMetricLabelClass}>Portfolio value</p>
            <p
              className={`mt-0.5 break-words text-white ${appDisplayClass} ${
                heroElevated ? "tracking-[-0.04em]" : ""
              }`}
            >
              {snapshot.portfolioValueAvailable
                ? formatEur(snapshot.portfolioValue)
                : "Unavailable"}
            </p>
            {presentedCoverageMessage ? (
              <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
                {presentedCoverageMessage}
              </p>
            ) : null}
          </div>
          {refresh ? (
            <RefreshPricesButton
              variant="icon"
              appearance="onDark"
              onClick={refresh.onRefresh}
              isRefreshing={refresh.isRefreshing}
              disabled={refresh.disabled}
              status={refresh.status}
            />
          ) : null}
        </div>

        <div className="mt-1.5 min-w-0 lg:mt-2 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end lg:gap-6">
          <div className="min-w-0">
            <p className={appHeroMetricLabelClass}>Latest move</p>
            <p
              className={`mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${appHeroMatchedKpiClass} ${moveTone}`}
              title={snapshot.dailyMoveAccessibleDescription}
            >
              <span>{showMove ? amountLabel : "Change unavailable"}</span>
              {showMove && percentLabel ? (
                <span className="opacity-90">{percentLabel}</span>
              ) : null}
            </p>
            <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
              {priceBasisLabel}
              {updatedLabel ? ` · ${updatedLabel}` : null}
              {isStaleDisplay && !updatedLabel ? " · Previous close" : null}
            </p>
            <div className="-mt-1">
              <ConversionDetailsDisclosure
                compactTrigger
                quietTrigger
                tone="dark"
              />
            </div>
          </div>
          <div className="mt-1.5 min-w-0 lg:mt-0">
            <HeroPerformanceSparkline
              weekPoints={weekPerformancePoints}
              monthPoints={monthPerformancePoints ?? performancePoints}
              tone={sparklineTone(snapshot)}
              compactOnMobile
              appearance="onDark"
            />
          </div>
        </div>

        <p className="sr-only" data-testid="dashboard-hero-freshness">
          {updatedLabel ?? (isStaleDisplay ? "Previous close" : "")}
        </p>

        {refresh?.message &&
        (refresh.status === "success" ||
          refresh.status === "error" ||
          refresh.status === "loading") ? (
          <p
            className={`mt-1 ${appDashboardDarkMetaClass}`}
            role="status"
            aria-live="polite"
            data-refresh-feedback={refresh.status}
          >
            {refresh.status === "error"
              ? "Prices could not be refreshed. Your last available figures remain visible."
              : refresh.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
