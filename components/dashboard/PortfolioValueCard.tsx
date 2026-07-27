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

function ambientGlowClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData || snapshot.todayChange === 0) {
    return "from-slate-950 via-slate-950 to-slate-900";
  }
  if (snapshot.todayChange > 0) {
    return "from-slate-950 via-slate-950 to-emerald-950/40";
  }
  return "from-slate-950 via-slate-950 to-red-950/35";
}

function ambientOrbClass(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.hasDailyData || snapshot.todayChange === 0) {
    return "bg-white/[0.04]";
  }
  if (snapshot.todayChange > 0) {
    return "bg-emerald-400/10";
  }
  return "bg-red-400/10";
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
    <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <Link
        href={href}
        className="mt-1.5 block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        title={displayName}
      >
        <p className="truncate text-base font-bold leading-tight text-white sm:text-lg">
          {mover.holding.symbol}
        </p>
        {displayName !== mover.holding.symbol ? (
          <p className="mt-0.5 hidden truncate text-xs text-white/55 sm:block">
            {displayName}
          </p>
        ) : null}
      </Link>
      <div className={`mt-1.5 flex min-w-0 items-center gap-1 ${accentClass}`}>
        <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
        <span className="truncate text-xl font-black leading-none tracking-[-0.03em] tabular-nums sm:text-2xl">
          {signedPercent(mover.changePercent)}
        </span>
      </div>
      {periodLabel ? (
        <span
          className="mt-1 hidden max-w-full truncate text-[11px] font-medium leading-snug text-white/50 sm:block"
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
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5">
        <p className="text-sm leading-relaxed text-white/60">{unavailableCopy}</p>
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3"
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
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-2.5 sm:px-3.5 sm:py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
            Weakest mover
          </p>
          <p className="mt-1.5 text-sm text-white/55">No negative mover</p>
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
      className={`relative min-w-0 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b ${ambientGlowClass(snapshot)} text-white shadow-[0_28px_80px_-24px_rgba(2,6,23,0.75)] md:rounded-[32px]`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${ambientOrbClass(snapshot)}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-sky-400/[0.04] blur-3xl"
        aria-hidden
      />

      <div className="relative px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 md:px-8 md:pb-6 md:pt-6">
        <p className="text-[11px] font-medium tracking-[0.02em] text-white/45">
          {welcomeLine}
        </p>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 sm:text-[12px]">
          Portfolio value
        </p>
        <p
          className="mt-2 max-w-full break-words text-[2.625rem] font-black leading-[0.95] tracking-[-0.045em] text-white tabular-nums sm:text-[3.25rem] md:text-[3.75rem] lg:text-[4.25rem]"
        >
          {snapshot.portfolioValueAvailable
            ? formatEur(snapshot.portfolioValue)
            : "Unavailable"}
        </p>

        <div className="mt-1.5">
          <ConversionDetailsDisclosure compactTrigger tone="dark" />
        </div>
        {snapshot.portfolioValueCoverageMessage ? (
          <p className="mt-1.5 text-[12px] font-medium text-white/60 sm:text-[13px]">
            {snapshot.portfolioValueCoverageMessage}
          </p>
        ) : null}

        <div className="mt-4 border-t border-white/[0.08] pt-4 sm:mt-5 sm:pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 sm:text-[12px]">
            Latest portfolio move
          </p>
          <p
            className={`mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[1.625rem] font-bold leading-none tracking-[-0.035em] tabular-nums sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] ${moveTone}`}
            title={snapshot.dailyMoveAccessibleDescription}
          >
            <span>{showMove ? amountLabel : "Change unavailable"}</span>
            {showMove && percentLabel ? (
              <span className="opacity-95">{percentLabel}</span>
            ) : null}
          </p>
          <p className="mt-1.5 text-[12px] font-medium leading-snug text-white/60 sm:mt-2 sm:text-[13px]">
            {showMove
              ? snapshot.dailyMoveContextLine
              : snapshot.dailyPerformanceCoverageMessage ??
                "Movement period unavailable"}
          </p>
        </div>

        <div className="mt-3.5 sm:mt-5">
          <MoversSection snapshot={snapshot} />
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-3.5 sm:mt-5 sm:gap-3 sm:pt-4">
          <p className="text-[12px] font-medium text-white/65 sm:text-[13px]">
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
              className="border-white/15 bg-white/[0.06] hover:bg-white/[0.1]"
            />
          ) : null}
        </div>
        {refresh?.message &&
        (refresh.status === "success" ||
          refresh.status === "error" ||
          refresh.status === "loading") ? (
          <p
            className="mt-1.5 text-[12px] font-medium text-white/65 sm:mt-2 sm:text-[13px]"
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
