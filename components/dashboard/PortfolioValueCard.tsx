"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { DailyPortfolioBriefing } from "@/components/dashboard/DailyPortfolioBriefing";
import { HeroPerformanceSparkline } from "@/components/dashboard/HeroPerformanceSparkline";
import { HeroPortfolioPulse } from "@/components/dashboard/HeroPortfolioPulse";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { HeroMover } from "@/lib/client/dailyPerformance";
import { previousClosePhraseFromContextLine } from "@/lib/client/dailyPortfolioBriefing";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import { resolvePortfolioDisplayFreshness } from "@/lib/client/portfolioDisplayFreshness";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { SmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import {
  appDashboardHeroInsetClass,
  appDashboardHeroMetaClass,
  appDashboardHeroMetricLabelClass,
  appDashboardHeroShellClass,
  appDashboardHeroSubordinateClass,
  appDisplayClass,
  appHeroMatchedKpiClass,
  appHeroPaddingCompactClass,
} from "@/components/layout/appSurface";
import {
  appKpiNegativeClass,
  appKpiPositiveClass,
} from "@/components/layout/semanticIdentity";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function moveToneClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData) {
    return "text-slate-700";
  }
  if (snapshot.todayChange > 0) {
    return appKpiPositiveClass;
  }
  if (snapshot.todayChange < 0) {
    return appKpiNegativeClass;
  }
  return "text-slate-950";
}

function sparklineTone(
  snapshot: DashboardPortfolioSnapshot,
): "positive" | "negative" | "neutral" {
  if (!snapshot.hasDailyData) return "neutral";
  if (snapshot.todayPercent > 0) return "positive";
  if (snapshot.todayPercent < 0) return "negative";
  return "neutral";
}

function SnapshotMover({
  label,
  mover,
  tone,
}: {
  label: string;
  mover: HeroMover;
  tone: "positive" | "negative";
}) {
  const accentClass = tone === "positive" ? appKpiPositiveClass : appKpiNegativeClass;
  const Icon =
    tone === "positive" || mover.changePercent > 0
      ? TrendingUp
      : mover.changePercent < 0
        ? TrendingDown
        : Minus;
  const displayName = mover.holding.name || mover.holding.symbol;

  return (
    <Link
      href={holdingDetailPath(mover.holding.symbol)}
      prefetch
      className={`block min-h-[56px] min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 ${appDashboardHeroInsetClass} px-2.5 py-2 sm:min-h-[64px] sm:rounded-2xl sm:px-3 sm:py-2.5`}
      aria-label={`${label}: ${displayName}, ${signedPercent(mover.changePercent)}. ${mover.changePeriodAccessibleDescription}`}
    >
      <p className={appDashboardHeroMetricLabelClass}>{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-slate-950 sm:mt-1 sm:text-[15px]">
        {displayName}
      </p>
      <div className={`mt-0.5 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-[15px] font-bold tabular-nums tracking-[-0.02em] sm:text-[15px]">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
    </Link>
  );
}

/**
 * Light Q1 cyan portfolio hero — value panel + subordinate pulse panel.
 * Mobile: two shorter light panels with page-background gap between them.
 */
export function PortfolioValueCard({
  snapshot,
  refresh,
  pulse = null,
  smart,
  performancePoints = null,
  weekPerformancePoints = null,
  monthPerformancePoints = null,
  pulseAttributionEnrichment = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  pulse?: PortfolioPulseResult | null;
  smart: SmartDashboardIntelligence;
  /** @deprecated Prefer weekPerformancePoints + monthPerformancePoints. */
  performancePoints?: PortfolioPerformancePoint[] | null;
  weekPerformancePoints?: PortfolioPerformancePoint[] | null;
  monthPerformancePoints?: PortfolioPerformancePoint[] | null;
  pulseAttributionEnrichment?: {
    daily?: string[];
    weekly?: string[];
    monthly?: string[];
  } | null;
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
  const focus = smart.todaysFocus;
  const concentrationLabel =
    snapshot.concentrationWeightPercent != null &&
    snapshot.concentrationWeightPercent >= 40 &&
    snapshot.concentrationSymbol
      ? `${snapshot.concentrationSymbol} · ${Math.round(snapshot.concentrationWeightPercent)}%`
      : null;

  const hasSnapshotItems =
    Boolean(focus) ||
    Boolean(concentrationLabel) ||
    Boolean(snapshot.hasReliableHeroMoverData && snapshot.heroTopMover);

  const shellClass = `relative overflow-hidden ${appDashboardHeroShellClass} ${
    heroElevated
      ? "ring-1 ring-cyan-300/60 motion-safe:shadow-[0_16px_40px_-24px_rgba(8,145,178,0.35)]"
      : ""
  }`;

  return (
    <div
      className="space-y-3 sm:space-y-4"
      data-testid="dashboard-portfolio-hero"
      data-hero-emphasis={heroElevated ? "elevated" : "default"}
      data-hero-scenario={smart.scenario}
    >
      {/* Panel 1 — portfolio value / move / trend */}
      <article
        aria-label="Portfolio value"
        className={shellClass}
        data-testid="hero-zone-primary"
      >
        <div className={`relative min-w-0 ${appHeroPaddingCompactClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={appDashboardHeroMetricLabelClass}>Portfolio value</p>
              <p
                className={`mt-1 break-words text-slate-950 ${appDisplayClass} ${
                  heroElevated ? "tracking-[-0.04em]" : ""
                }`}
              >
                {snapshot.portfolioValueAvailable
                  ? formatEur(snapshot.portfolioValue)
                  : "Unavailable"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <ConversionDetailsDisclosure compactTrigger tone="light" />
                {snapshot.portfolioValueCoverageMessage ? (
                  <p className={appDashboardHeroMetaClass}>
                    {snapshot.portfolioValueCoverageMessage}
                  </p>
                ) : null}
              </div>
            </div>
            {refresh ? (
              <RefreshPricesButton
                variant="icon"
                appearance="onLight"
                onClick={refresh.onRefresh}
                isRefreshing={refresh.isRefreshing}
                disabled={refresh.disabled}
                status={refresh.status}
              />
            ) : null}
          </div>

          <div className="mt-3 min-w-0 border-t border-brand/20 pt-3 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-5 lg:pt-4">
            <div className="min-w-0">
              <p className={appDashboardHeroMetricLabelClass}>Latest move</p>
              <p
                className={`mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${appHeroMatchedKpiClass} ${moveTone}`}
                title={snapshot.dailyMoveAccessibleDescription}
              >
                <span>{showMove ? amountLabel : "Change unavailable"}</span>
                {showMove && percentLabel ? (
                  <span className="opacity-90">{percentLabel}</span>
                ) : null}
              </p>
              <p className={`mt-1 ${appDashboardHeroMetaClass}`}>
                {priceBasisLabel}
              </p>
            </div>
            <div className="mt-2.5 min-w-0 lg:mt-0">
              <HeroPerformanceSparkline
                weekPoints={weekPerformancePoints}
                monthPoints={monthPerformancePoints ?? performancePoints}
                tone={sparklineTone(snapshot)}
                compactOnMobile
                appearance="onLight"
              />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {updatedLabel ? (
                <p
                  className={appDashboardHeroMetaClass}
                  data-testid="dashboard-hero-freshness"
                >
                  {isStaleDisplay ? (
                    <span className="text-amber-800">Previous close · </span>
                  ) : null}
                  {updatedLabel}
                </p>
              ) : isStaleDisplay ? (
                <p className={appDashboardHeroMetaClass}>
                  <span className="text-amber-800">Previous close</span>
                </p>
              ) : null}
          </div>

          {refresh?.message &&
          (refresh.status === "success" ||
            refresh.status === "error" ||
            refresh.status === "loading") ? (
            <p
              className={`mt-1.5 ${appDashboardHeroMetaClass}`}
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

      {/* Panel 2 — pulse / focus / movers / briefing */}
      <article
        aria-label="Portfolio pulse"
        className={`relative overflow-hidden ${appDashboardHeroSubordinateClass}`}
        data-testid="hero-zone-snapshot"
      >
        <div className={`relative min-w-0 ${appHeroPaddingCompactClass}`}>
          {pulse ? (
            <HeroPortfolioPulse
              pulse={pulse}
              attributionEnrichment={pulseAttributionEnrichment}
            />
          ) : null}

          {hasSnapshotItems ? (
            <div
              className={`grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-3 ${
                pulse ? "mt-3" : ""
              }`}
              aria-label="Portfolio snapshot"
              data-testid="hero-snapshot-strip"
            >
              {focus ? (
                <div
                  className={`${appDashboardHeroInsetClass} col-span-2 min-h-[56px] px-2.5 py-2 sm:min-h-[64px] sm:px-3 sm:py-2.5 lg:col-span-1`}
                >
                  <p className={appDashboardHeroMetricLabelClass}>Today’s focus</p>
                  {focus.href ? (
                    <Link
                      href={focus.href}
                      className="mt-0.5 block truncate text-[15px] font-semibold text-slate-950 underline-offset-2 hover:underline sm:mt-1"
                    >
                      {focus.label}
                    </Link>
                  ) : (
                    <p className="mt-0.5 truncate text-[15px] font-semibold text-slate-950 sm:mt-1">
                      {focus.label}
                    </p>
                  )}
                  {concentrationLabel && focus.kind === "concentration" ? (
                    <p className={`mt-0.5 ${appDashboardHeroMetaClass}`}>
                      {concentrationLabel}
                    </p>
                  ) : null}
                </div>
              ) : concentrationLabel ? (
                <div
                  className={`${appDashboardHeroInsetClass} col-span-2 min-h-[56px] px-2.5 py-2 sm:min-h-[64px] sm:px-3 sm:py-2.5 lg:col-span-1`}
                >
                  <p className={appDashboardHeroMetricLabelClass}>Portfolio structure</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-slate-950 sm:mt-1">
                    Largest holding {concentrationLabel}
                  </p>
                </div>
              ) : null}

              {snapshot.hasReliableHeroMoverData && snapshot.heroTopMover ? (
                <SnapshotMover
                  label="Biggest mover"
                  mover={snapshot.heroTopMover}
                  tone="positive"
                />
              ) : null}

              {snapshot.hasReliableHeroMoverData && snapshot.heroLowestMover ? (
                <SnapshotMover
                  label="Weakest mover"
                  mover={snapshot.heroLowestMover}
                  tone="negative"
                />
              ) : null}
            </div>
          ) : null}

          <div className={pulse || hasSnapshotItems ? "mt-3" : undefined}>
            <DailyPortfolioBriefing
              briefing={smart.briefing}
              todaysFocus={null}
              appearance="onLight"
            />
          </div>
        </div>
      </article>
    </div>
  );
}
