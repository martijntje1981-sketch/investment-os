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
import { formatAmsterdamPriceRefreshTime } from "@/lib/client/marketSnapshotSync";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { SmartDashboardIntelligence } from "@/lib/client/smartDashboardIntelligence";
import {
  appDarkInsetClass,
  appDisplayClass,
  appHeroMatchedKpiClass,
  appHeroMetricLabelClass,
  appHeroPaddingCompactClass,
  appHeroShellClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function moveToneClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData) {
    return "text-white/55";
  }
  if (snapshot.todayChange > 0) {
    return "text-emerald-300";
  }
  if (snapshot.todayChange < 0) {
    return "text-red-300";
  }
  return "text-white/80";
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
  const accentClass = tone === "positive" ? "text-emerald-300" : "text-red-300";
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
      className={`block min-h-[56px] min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appDarkInsetClass} px-2.5 py-2 sm:min-h-[64px] sm:rounded-2xl sm:px-3 sm:py-2.5`}
      aria-label={`${label}: ${displayName}, ${signedPercent(mover.changePercent)}. ${mover.changePeriodAccessibleDescription}`}
    >
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold leading-tight text-white sm:mt-1 sm:text-[13px]">
        {displayName}
      </p>
      <div className={`mt-0.5 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-[13px] font-bold tabular-nums tracking-[-0.02em] sm:text-sm">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
    </Link>
  );
}

/**
 * Premium black portfolio hero — value, move, trend, pulse, glanceable snapshot.
 * Mobile: Zone 1 status + Zone 2 snapshot (visually segmented).
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

  const updatedLabel = refresh?.liveRefreshAt
    ? `Updated ${formatAmsterdamPriceRefreshTime(refresh.liveRefreshAt)}`
    : `Updated ${formatMarketUpdateTime(snapshot.lastUpdatedAt)}`;

  const priceBasisLabel = showMove
    ? usesPreviousClose
      ? previousClosePhrase
        ? `Based on ${previousClosePhrase}`
        : "Based on the previous market close"
      : snapshot.dailyMoveContextLine
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

  return (
    <article
      aria-label="Portfolio value"
      className={`relative overflow-hidden ${appHeroShellClass} ${
        heroElevated
          ? "ring-1 ring-white/20 motion-safe:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
          : ""
      }`}
      data-testid="dashboard-portfolio-hero"
      data-hero-emphasis={heroElevated ? "elevated" : "default"}
      data-hero-scenario={smart.scenario}
    >
      {/* ZONE 1 — primary status */}
      <div
        className={`relative min-w-0 ${appHeroPaddingCompactClass}`}
        data-testid="hero-zone-primary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={appHeroMetricLabelClass}>Portfolio value</p>
            <p
              className={`mt-1 break-words text-white ${appDisplayClass} ${
                heroElevated ? "tracking-[-0.04em]" : ""
              }`}
            >
              {snapshot.portfolioValueAvailable
                ? formatEur(snapshot.portfolioValue)
                : "Unavailable"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ConversionDetailsDisclosure compactTrigger tone="dark" />
              {snapshot.portfolioValueCoverageMessage ? (
                <p className="text-[12px] font-medium text-white/50">
                  {snapshot.portfolioValueCoverageMessage}
                </p>
              ) : null}
            </div>
          </div>
          {refresh ? (
            <RefreshPricesButton
              variant="icon"
              onClick={refresh.onRefresh}
              isRefreshing={refresh.isRefreshing}
              disabled={refresh.disabled}
              status={refresh.status}
            />
          ) : null}
        </div>

        <div className="mt-3 min-w-0 border-t border-white/10 pt-3 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-5 lg:pt-4">
          <div className="min-w-0">
            <p className={appHeroMetricLabelClass}>Latest move</p>
            <p
              className={`mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${appHeroMatchedKpiClass} ${moveTone}`}
              title={snapshot.dailyMoveAccessibleDescription}
            >
              <span>{showMove ? amountLabel : "Change unavailable"}</span>
              {showMove && percentLabel ? (
                <span className="opacity-90">{percentLabel}</span>
              ) : null}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-snug text-white/50">
              {priceBasisLabel}
            </p>
          </div>
          <div className="mt-2.5 min-w-0 lg:mt-0">
            <HeroPerformanceSparkline
              weekPoints={weekPerformancePoints}
              monthPoints={monthPerformancePoints ?? performancePoints}
              tone={sparklineTone(snapshot)}
              compactOnMobile
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-medium text-white/50">
            {isStaleDisplay ? (
              <span className="text-amber-200/90">Previous close · </span>
            ) : null}
            {updatedLabel}
          </p>
        </div>

        {refresh?.message &&
        (refresh.status === "success" ||
          refresh.status === "error" ||
          refresh.status === "loading") ? (
          <p
            className="mt-1.5 text-[12px] font-medium text-white/55"
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

      {/* ZONE 2 — secondary snapshot (segmented on mobile; integrated on desktop) */}
      {pulse || hasSnapshotItems ? (
        <div
          className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-3 sm:mx-4 sm:mb-3.5 sm:px-3.5 sm:py-3.5 md:mx-5 lg:mx-5 lg:mb-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pt-0"
          data-testid="hero-zone-snapshot"
        >
          <div className="hidden border-t border-white/10 lg:block" />

          {pulse ? (
            <div className="lg:mt-4 lg:border-t lg:border-white/10 lg:pt-4">
              <HeroPortfolioPulse
                pulse={pulse}
                attributionEnrichment={pulseAttributionEnrichment}
              />
            </div>
          ) : null}

          {hasSnapshotItems ? (
            <div
              className={`grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-3 ${
                pulse ? "mt-3 lg:mt-4 lg:border-t lg:border-white/10 lg:pt-4" : ""
              }`}
              aria-label="Portfolio snapshot"
              data-testid="hero-snapshot-strip"
            >
              {focus ? (
                <div
                  className={`${appDarkInsetClass} col-span-2 min-h-[56px] px-2.5 py-2 sm:min-h-[64px] sm:px-3 sm:py-2.5 lg:col-span-1`}
                >
                  <p className={appHeroMetricLabelClass}>Today’s focus</p>
                  {focus.href ? (
                    <Link
                      href={focus.href}
                      className="mt-0.5 block truncate text-[12px] font-semibold text-white underline-offset-2 hover:underline sm:mt-1 sm:text-[13px]"
                    >
                      {focus.label}
                    </Link>
                  ) : (
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-white sm:mt-1 sm:text-[13px]">
                      {focus.label}
                    </p>
                  )}
                  {concentrationLabel && focus.kind === "concentration" ? (
                    <p className="mt-0.5 text-[11px] font-medium text-white/45">
                      {concentrationLabel}
                    </p>
                  ) : null}
                </div>
              ) : concentrationLabel ? (
                <div
                  className={`${appDarkInsetClass} col-span-2 min-h-[56px] px-2.5 py-2 sm:min-h-[64px] sm:px-3 sm:py-2.5 lg:col-span-1`}
                >
                  <p className={appHeroMetricLabelClass}>Portfolio structure</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-white sm:mt-1 sm:text-[13px]">
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
        </div>
      ) : null}

      <div className={`relative min-w-0 ${appHeroPaddingCompactClass} !pt-0`}>
        <DailyPortfolioBriefing
          briefing={smart.briefing}
          todaysFocus={null}
        />
      </div>
    </article>
  );
}
