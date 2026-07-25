"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import type { HeroMover } from "@/lib/client/dailyPerformance";
import { RANKING_AFTER_CLOSE } from "@/lib/client/investorOverviewCopy";

function signedPercent(value: number) {
  const formatted = formatPortfolioPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function resolveHoldingHref(mover: HeroMover): string {
  return `/portfolio/${mover.holding.symbol.toLowerCase()}`;
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
  const borderClass = isPositive ? "border-emerald-400/20" : "border-red-400/20";
  const Icon = isPositive
    ? TrendingUp
    : mover.changePercent < 0
      ? TrendingDown
      : Minus;

  return (
    <article
      className={`min-w-0 rounded-2xl border bg-white/[0.03] px-3.5 py-3 ${borderClass}`}
    >
      <p className={appHeroMetricLabelClass}>{label}</p>
      <Link
        href={resolveHoldingHref(mover)}
        className="mt-2 block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <p className="truncate text-sm font-bold text-white">
          {mover.holding.name || mover.holding.symbol}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
          {mover.holding.symbol}
        </p>
      </Link>
      <div className={`mt-2.5 flex flex-wrap items-center gap-1.5 ${accentClass}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-sm font-bold tabular-nums">
          {signedPercent(mover.changePercent)}
        </span>
        <span className={appDashboardDarkMetaClass}>
          {mover.changePeriodLabel}
        </span>
      </div>
    </article>
  );
}

export function DashboardHeroMovers({
  topMover,
  lowestMover,
  hasReliableHeroMoverData,
  performanceCoverageComplete,
}: {
  topMover: HeroMover | null;
  lowestMover: HeroMover | null;
  hasReliableHeroMoverData: boolean;
  performanceCoverageComplete: boolean;
}) {
  if (!performanceCoverageComplete) {
    return (
      <div className="border-t border-white/[0.08] px-5 py-4 sm:px-7 md:px-8">
        <p className={`${appDashboardDarkMetaClass} text-sm leading-relaxed`}>
          {RANKING_AFTER_CLOSE}
        </p>
      </div>
    );
  }

  if (!hasReliableHeroMoverData || !topMover) {
    return null;
  }

  return (
    <div
      className="border-t border-white/[0.08] px-5 py-4 sm:px-7 md:px-8"
      aria-label="Portfolio movers"
    >
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <MoverTile label="Top mover" mover={topMover} tone="positive" />
        {lowestMover ? (
          <MoverTile label="Lowest mover" mover={lowestMover} tone="negative" />
        ) : null}
      </div>
    </div>
  );
}
