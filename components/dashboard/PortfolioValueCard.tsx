"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { HeroMover } from "@/lib/client/dailyPerformance";
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
  appHeroMatchedKpiClass,
  appHeroMetricLabelClass,
  appHeroPaddingCompactClass,
  appHeroShellClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function moveToneClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData) {
    return "text-slate-300";
  }
  if (snapshot.todayChange > 0) {
    return "text-emerald-300";
  }
  if (snapshot.todayChange < 0) {
    return "text-red-300";
  }
  return "text-slate-200";
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
  const href = `/portfolio/${mover.holding.symbol.toLowerCase()}`;
  const periodLabel = mover.changePeriodLabel.trim();

  return (
    <article className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <Link
        href={href}
        className="mt-1 block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
        title={displayName}
      >
        <p className="truncate text-sm font-bold leading-tight text-white sm:text-base">
          {mover.holding.symbol}
        </p>
        {displayName !== mover.holding.symbol ? (
          <p className="mt-0.5 hidden truncate text-xs text-white/55 sm:block">
            {displayName}
          </p>
        ) : null}
      </Link>
      <div className={`mt-1 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
        <span className="truncate text-base font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-lg">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
      {periodLabel ? (
        <span
          className="mt-0.5 hidden max-w-full truncate text-[11px] font-medium leading-snug text-white/50 sm:block"
          title={mover.changePeriodAccessibleDescription}
          aria-label={mover.changePeriodAccessibleDescription}
        >
          {periodLabel}
        </span>
      ) : (
        <span className="sr-only">
          {mover.changePeriodAccessibleDescription}
        </span>
      )}
    </article>
  );
}

function MoversSection({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
  if (!snapshot.hasReliableHeroMoverData || !snapshot.heroTopMover) {
    const unavailableCopy =
      snapshot.hasDailyData && snapshot.dailyPerformanceCoverageMessage
        ? snapshot.dailyPerformanceCoverageMessage
        : RANKING_AFTER_CLOSE;

    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2">
        <p className="text-sm leading-relaxed text-white/60">{unavailableCopy}</p>
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5"
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
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
            Weakest mover
          </p>
          <p className="mt-1 text-sm text-white/55">No negative mover</p>
        </div>
      )}
    </div>
  );
}

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
      className={`relative ${appHeroShellClass}`}
    >
      <div className={`relative ${appHeroPaddingCompactClass}`}>
        <p className="text-[11px] font-medium tracking-[0.02em] text-white/45">
          {welcomeLine}
        </p>

        <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="min-w-0">
            <p className={appHeroMetricLabelClass}>Portfolio value</p>
            <p className={`mt-1.5 text-white ${appHeroMatchedKpiClass}`}>
              {snapshot.portfolioValueAvailable
                ? formatEur(snapshot.portfolioValue)
                : "Unavailable"}
            </p>
            <div className="mt-1">
              <ConversionDetailsDisclosure compactTrigger tone="dark" />
            </div>
            {snapshot.portfolioValueCoverageMessage ? (
              <p className="mt-1 text-[12px] font-medium text-white/60">
                {snapshot.portfolioValueCoverageMessage}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className={appHeroMetricLabelClass}>Latest portfolio move</p>
            <p
              className={`mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${appHeroMatchedKpiClass} ${moveTone}`}
              title={snapshot.dailyMoveAccessibleDescription}
            >
              <span>{showMove ? amountLabel : "Change unavailable"}</span>
              {showMove && percentLabel ? (
                <span className="opacity-95">{percentLabel}</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-[12px] font-medium leading-snug text-white/60">
              {showMove
                ? snapshot.dailyMoveContextLine
                : snapshot.dailyPerformanceCoverageMessage ??
                  "Movement period unavailable"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <MoversSection snapshot={snapshot} />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <p className="text-[12px] font-medium text-white/65">
              {snapshot.isStale && !refresh?.liveRefreshAt ? "Stale prices · " : null}
              {updatedLabel}
            </p>
            {refresh ? (
              <RefreshPricesButton
                variant="compact"
                onClick={refresh.onRefresh}
                isRefreshing={refresh.isRefreshing}
                disabled={refresh.disabled}
                status={refresh.status}
                className="border-brand/30 bg-brand/15 text-white hover:bg-brand/25"
              />
            ) : null}
          </div>
        </div>
        {refresh?.message &&
        (refresh.status === "success" ||
          refresh.status === "error" ||
          refresh.status === "loading") ? (
          <p
            className="mt-1.5 text-[12px] font-medium text-white/65"
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
