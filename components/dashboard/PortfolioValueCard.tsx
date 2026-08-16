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
      className={`block min-h-[72px] min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appDarkInsetClass} px-3 py-2.5`}
      aria-label={`${label}: ${displayName}, ${signedPercent(mover.changePercent)}. ${mover.changePeriodAccessibleDescription}`}
    >
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold leading-tight text-white">
        {displayName}
      </p>
      <div className={`mt-1 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-sm font-bold tabular-nums tracking-[-0.02em]">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
    </Link>
  );
}

/**
 * Premium black portfolio hero — value, move, trend, pulse, glanceable snapshot.
 */
export function PortfolioValueCard({
  snapshot,
  refresh,
  pulse = null,
  smart,
  performancePoints = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  pulse?: PortfolioPulseResult | null;
  smart: SmartDashboardIntelligence;
  /** Existing 1M (or week) history points for the hero sparkline. */
  performancePoints?: PortfolioPerformancePoint[] | null;
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
      <div className={`relative min-w-0 ${appHeroPaddingCompactClass}`}>
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
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
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

        <div className="mt-4 min-w-0 border-t border-white/10 pt-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-5">
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
          <div className="mt-3 min-w-0 lg:mt-0">
            <HeroPerformanceSparkline
              points={performancePoints}
              tone={sparklineTone(snapshot)}
            />
          </div>
        </div>

        {pulse ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <HeroPortfolioPulse pulse={pulse} />
          </div>
        ) : null}

        <div
          className="mt-4 grid min-w-0 grid-cols-1 gap-2 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Portfolio snapshot"
          data-testid="hero-snapshot-strip"
        >
          {focus ? (
            <div className={`${appDarkInsetClass} min-h-[72px] px-3 py-2.5`}>
              <p className={appHeroMetricLabelClass}>Today’s focus</p>
              {focus.href ? (
                <Link
                  href={focus.href}
                  className="mt-1 block truncate text-[13px] font-semibold text-white underline-offset-2 hover:underline"
                >
                  {focus.label}
                </Link>
              ) : (
                <p className="mt-1 truncate text-[13px] font-semibold text-white">
                  {focus.label}
                </p>
              )}
              {concentrationLabel && focus.kind === "concentration" ? (
                <p className="mt-1 text-[11px] font-medium text-white/45">
                  {concentrationLabel}
                </p>
              ) : null}
            </div>
          ) : concentrationLabel ? (
            <div className={`${appDarkInsetClass} min-h-[72px] px-3 py-2.5`}>
              <p className={appHeroMetricLabelClass}>Portfolio structure</p>
              <p className="mt-1 text-[13px] font-semibold text-white">
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
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

        <DailyPortfolioBriefing
          briefing={smart.briefing}
          todaysFocus={null}
        />
      </div>
    </article>
  );
}
