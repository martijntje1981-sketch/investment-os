"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { HeroMover } from "@/lib/client/dailyPerformance";
import { RANKING_AFTER_CLOSE } from "@/lib/client/investorOverviewCopy";

import { holdingDetailPath } from "@/lib/navigation/appRoutes";

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function resolveHoldingHref(mover: HeroMover): string {
  return holdingDetailPath(mover.holding.symbol);
}

function MoverTile({
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
  const borderClass = isPositive
    ? "border-emerald-400/20"
    : "border-red-400/20";
  const Icon = isPositive
    ? TrendingUp
    : mover.changePercent < 0
      ? TrendingDown
      : Minus;
  const displayName = mover.holding.name || mover.holding.symbol;

  return (
    <Link
      href={resolveHoldingHref(mover)}
      className={`block min-w-0 rounded-xl border bg-white/[0.03] px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${borderClass}`}
      aria-label={`Open ${displayName} holding details`}
      title={displayName}
    >
      <p className={appHeroMetricLabelClass}>{label}</p>
      <div className="mt-1.5 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">
            {mover.holding.symbol}
          </p>
          {displayName !== mover.holding.symbol ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/65">
              {displayName}
            </p>
          ) : null}
          <p className="mt-1 text-[13px] font-semibold text-white/80">
            View holding →
          </p>
        </div>
        <div
          className={`flex shrink-0 flex-col items-end gap-0.5 ${accentClass}`}
        >
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-sm font-bold tabular-nums">
              {signedPercent(mover.changePercent)}
            </span>
          </div>
          <span
            className={`${appDashboardDarkMetaClass} text-[11px]`}
            title={mover.changePeriodAccessibleDescription}
            aria-label={mover.changePeriodAccessibleDescription}
          >
            {mover.changePeriodLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function DashboardHeroMovers({
  topMover,
  lowestMover,
  hasReliableHeroMoverData,
  hasDailyData,
  coverageMessage,
}: {
  topMover: HeroMover | null;
  lowestMover: HeroMover | null;
  hasReliableHeroMoverData: boolean;
  hasDailyData: boolean;
  coverageMessage?: string | null;
}) {
  if (!hasReliableHeroMoverData) {
    const unavailableCopy =
      hasDailyData && coverageMessage ? coverageMessage : RANKING_AFTER_CLOSE;

    return (
      <div className="border-t border-white/[0.08] px-5 py-3 sm:px-7 sm:py-4 md:px-8">
        <p className={`${appDashboardDarkMetaClass} text-sm leading-relaxed`}>
          {unavailableCopy}
        </p>
      </div>
    );
  }

  if (!hasReliableHeroMoverData || !topMover) {
    return null;
  }

  const gridClass = lowestMover
    ? "grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
    : "grid min-w-0 grid-cols-1 gap-2.5 sm:max-w-xs";

  return (
    <div
      className="border-t border-white/[0.08] px-5 py-3 sm:px-7 sm:py-4 md:px-8"
      aria-label="Portfolio movers"
    >
      <div className={gridClass}>
        <MoverTile label="Top mover" mover={topMover} tone="positive" />
        {lowestMover ? (
          <MoverTile label="Lowest mover" mover={lowestMover} tone="negative" />
        ) : null}
      </div>
    </div>
  );
}
