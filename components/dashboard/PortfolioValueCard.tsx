"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { HeroTrendMicroVisual } from "@/components/dashboard/DashboardHeroIntelligence";
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
      className={`block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appDarkInsetClass} px-2.5 py-2`}
      aria-label={`${label}: ${displayName}, ${signedPercent(mover.changePercent)}`}
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
        label="Top mover"
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
 * Focused portfolio hero — value, move, movers, quiet refresh.
 * Supporting intelligence cards live outside this shell.
 */
export function PortfolioValueCard({
  snapshot,
  refresh,
  welcomeFirstName = null,
}: {
  snapshot: DashboardPortfolioSnapshot;
  welcomeFirstName?: string | null;
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

  return (
    <article
      aria-label="Portfolio value"
      className={`relative overflow-hidden ${appHeroShellClass}`}
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

        <div className="mt-2.5 min-w-0 md:mt-2">
          <p className={appHeroMetricLabelClass}>Portfolio value</p>
          <p className={`mt-1 break-words text-white ${appDisplayClass}`}>
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

        <div className="mt-2.5 min-w-0 border-t border-white/10 pt-2.5 md:mt-2 md:pt-2.5">
          <p className={appHeroMetricLabelClass}>Latest portfolio move</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2 md:mt-1.5">
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
                {showMove
                  ? snapshot.dailyMoveContextLine
                  : (snapshot.dailyPerformanceCoverageMessage ??
                    "Movement period unavailable")}
              </p>
            </div>
            <HeroTrendMicroVisual direction={trendDirection} />
          </div>
        </div>

        <div className="mt-2.5 border-t border-white/10 pt-2.5 md:mt-2 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-4 md:pt-2.5">
          <MoversSection snapshot={snapshot} />
          <div className="mt-2.5 flex items-center justify-between gap-2 md:mt-0 md:justify-end md:self-end">
            <p className="text-[12px] font-medium text-white/50 md:text-right">
              {snapshot.isStale && !refresh?.liveRefreshAt
                ? "Stale prices · "
                : null}
              {updatedLabel}
            </p>
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
            {refresh.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
