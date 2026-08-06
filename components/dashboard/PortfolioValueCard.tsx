"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { HeroTrendMicroVisual } from "@/components/dashboard/DashboardHeroIntelligence";
import { HeroPortfolioPulse } from "@/components/dashboard/HeroPortfolioPulse";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { HeroMover } from "@/lib/client/dailyPerformance";
import { resolveHeroTrendDirection } from "@/lib/client/dashboardHeroIntelligence";
import { RANKING_AFTER_CLOSE } from "@/lib/client/investorOverviewCopy";
import type { RefreshPricesUiStatus } from "@/lib/client/livePortfolioPriceRefreshAction";
import { formatAmsterdamPriceRefreshTime } from "@/lib/client/marketSnapshotSync";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
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

function MoverItem({
  label,
  mover,
  tone,
}: {
  label: string;
  mover: HeroMover;
  tone: "positive" | "negative";
}) {
  const isPositive = tone === "positive";
  const accentClass = isPositive ? "text-emerald-300" : "text-red-300";
  const Icon =
    isPositive || mover.changePercent > 0
      ? TrendingUp
      : mover.changePercent < 0
        ? TrendingDown
        : Minus;
  const displayName = mover.holding.name || mover.holding.symbol;
  const href = holdingDetailPath(mover.holding.symbol);
  const periodLabel = mover.changePeriodLabel.trim();

  return (
    <Link
      href={href}
      prefetch
      className={`block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appDarkInsetClass} px-2.5 py-2`}
      aria-label={`${label}: ${displayName}, ${signedPercent(mover.changePercent)}. ${mover.changePeriodAccessibleDescription}`}
      title={displayName}
    >
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold leading-tight text-white">
        {mover.holding.symbol}
      </p>
      <div className={`mt-1 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-sm font-bold leading-none tracking-[-0.02em] tabular-nums">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
      {periodLabel ? (
        <span
          className="mt-0.5 hidden max-w-full truncate text-[11px] font-medium text-white/45 sm:block"
          title={mover.changePeriodAccessibleDescription}
        >
          {periodLabel}
        </span>
      ) : (
        <span className="sr-only">
          {mover.changePeriodAccessibleDescription}
        </span>
      )}
    </Link>
  );
}

function MoversSection({ snapshot }: { snapshot: DashboardPortfolioSnapshot }) {
  if (!snapshot.hasReliableHeroMoverData || !snapshot.heroTopMover) {
    const unavailableCopy =
      snapshot.hasDailyData && snapshot.dailyPerformanceCoverageMessage
        ? snapshot.dailyPerformanceCoverageMessage
        : RANKING_AFTER_CLOSE;

    return (
      <div className={`border-dashed ${appDarkInsetClass} px-3 py-2`}>
        <p className="text-[13px] leading-relaxed text-white/55">
          {unavailableCopy}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0 grid-cols-2 gap-2"
      aria-label="Portfolio movers"
    >
      <MoverItem
        label="Biggest mover"
        mover={snapshot.heroTopMover}
        tone="positive"
      />
      {snapshot.heroLowestMover ? (
        <MoverItem
          label="Weakest mover"
          mover={snapshot.heroLowestMover}
          tone="negative"
        />
      ) : (
        <div className={`${appDarkInsetClass} border-dashed px-2.5 py-2`}>
          <p className={appHeroMetricLabelClass}>Weakest mover</p>
          <p className="mt-1 text-[13px] text-white/55">No negative mover</p>
        </div>
      )}
    </div>
  );
}

/**
 * Premium black portfolio hero — value, move, movers, compact pulse.
 */
export function PortfolioValueCard({
  snapshot,
  refresh,
  welcomeFirstName = null,
  pulse = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  welcomeFirstName?: string | null;
  pulse?: PortfolioPulseResult | null;
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
  const trendDirection = resolveHeroTrendDirection(snapshot);
  const welcomeLine = welcomeFirstName?.trim()
    ? `Welcome back, ${welcomeFirstName.trim()}`
    : "Welcome back";

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
    ? snapshot.dailyMoveContextLine
    : (snapshot.dailyPerformanceCoverageMessage ??
      "Movement period unavailable");

  const isStaleDisplay = Boolean(snapshot.isStale && !refresh?.liveRefreshAt);

  return (
    <article
      aria-label="Portfolio value"
      className={`relative overflow-hidden ${appHeroShellClass}`}
      data-testid="dashboard-portfolio-hero"
    >
      <div className={`relative min-w-0 ${appHeroPaddingCompactClass}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-[12px] font-medium tracking-[0.01em] text-white/45">
            {welcomeLine}
          </p>
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

        <div className="mt-3 min-w-0 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(11rem,0.65fr)] lg:items-start lg:gap-5">
          <div className="min-w-0">
            <p className={appHeroMetricLabelClass}>Portfolio value</p>
            <p className={`mt-1 break-words text-white ${appDisplayClass}`}>
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

            <div className="mt-3 min-w-0 border-t border-white/10 pt-3">
              <p className={appHeroMetricLabelClass}>Latest move</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${appHeroMatchedKpiClass} ${moveTone}`}
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
                <HeroTrendMicroVisual direction={trendDirection} />
              </div>
            </div>
          </div>

          {pulse ? (
            <div className="mt-3 border-t border-white/10 pt-3 lg:mt-0 lg:border-t-0 lg:border-l lg:border-white/10 lg:pl-5 lg:pt-0">
              <HeroPortfolioPulse pulse={pulse} />
            </div>
          ) : null}
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <MoversSection snapshot={snapshot} />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-white/50">
              {isStaleDisplay ? (
                <span className="text-amber-200/90">Previous close · </span>
              ) : null}
              {updatedLabel}
            </p>
            {isStaleDisplay ? (
              <p className="text-[11px] font-medium text-white/40">
                Not a live quote
              </p>
            ) : null}
          </div>
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
    </article>
  );
}
