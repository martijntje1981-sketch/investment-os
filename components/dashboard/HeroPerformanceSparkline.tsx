"use client";

import { useMemo, useState } from "react";

import {
  HERO_INTRADAY_HISTORY_AVAILABLE,
  HERO_TREND_PERIOD_ORDER,
  type HeroTrendPeriodId,
} from "@/components/dashboard/heroTrendPeriods";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type { HeroTrendPeriodId };
export { HERO_INTRADAY_HISTORY_AVAILABLE };

function usablePoints(
  points: PortfolioPerformancePoint[] | null | undefined,
): PortfolioPerformancePoint[] {
  return (points ?? []).filter((point) => Number.isFinite(point.portfolioValue));
}

function formatPeriodChange(
  points: PortfolioPerformancePoint[],
  period: "1W" | "1M",
): string {
  const values = points.map((point) => point.portfolioValue);
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const changePct = first !== 0 ? ((last - first) / first) * 100 : 0;
  const sign = changePct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(changePct).toFixed(1)}% over ${period}`;
}

/**
 * Real portfolio value sparkline for the Dashboard hero.
 * Local 1W / 1M switch — no fabricated intraday 1D series.
 */
export function HeroPerformanceSparkline({
  weekPoints = null,
  monthPoints = null,
  /** @deprecated Prefer weekPoints + monthPoints. Kept for transitional callers. */
  points = null,
  tone = "neutral",
  label = "Portfolio trend",
  className,
  compactOnMobile = false,
  appearance = "onLight",
}: {
  weekPoints?: PortfolioPerformancePoint[] | null;
  monthPoints?: PortfolioPerformancePoint[] | null;
  points?: PortfolioPerformancePoint[] | null;
  tone?: "positive" | "negative" | "neutral";
  label?: string;
  className?: string;
  /** Slightly shorter chart on narrow viewports. */
  compactOnMobile?: boolean;
  appearance?: "onLight" | "onDark";
}) {
  const onLight = appearance === "onLight";
  const weekSeries = useMemo(() => usablePoints(weekPoints), [weekPoints]);
  const monthSeries = useMemo(
    () => usablePoints(monthPoints ?? points),
    [monthPoints, points],
  );

  const weekAvailable = weekSeries.length >= 2;
  const monthAvailable = monthSeries.length >= 2;

  const [preferredPeriod, setPreferredPeriod] = useState<"1W" | "1M">("1M");

  const activePeriod: "1W" | "1M" =
    preferredPeriod === "1M" && monthAvailable
      ? "1M"
      : preferredPeriod === "1W" && weekAvailable
        ? "1W"
        : monthAvailable
          ? "1M"
          : "1W";

  const series = activePeriod === "1W" ? weekSeries : monthSeries;

  const heightClass = compactOnMobile
    ? "h-[56px] sm:h-[72px] lg:h-[84px]"
    : "h-[72px] sm:h-[84px]";
  const emptyHeightClass = compactOnMobile
    ? "h-[56px] sm:h-[72px]"
    : "h-[72px]";

  const periodLabel = activePeriod === "1W" ? "1W trend" : "1M trend";
  const changeLabel =
    series.length >= 2 ? formatPeriodChange(series, activePeriod) : null;

  const selector = (
    <div
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 ${
        onLight
          ? "border-sky-200 bg-white"
          : "border-white/15 bg-white/[0.06]"
      }`}
      role="tablist"
      aria-label="Portfolio trend period"
      data-testid="hero-trend-period-selector"
    >
      {HERO_TREND_PERIOD_ORDER.map((option) => {
        const is1D = option === "1D";
        const enabled = is1D
          ? HERO_INTRADAY_HISTORY_AVAILABLE
          : option === "1W"
            ? weekAvailable
            : monthAvailable;
        const selected = !is1D && enabled && activePeriod === option;

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!enabled}
            title={
              is1D && !HERO_INTRADAY_HISTORY_AVAILABLE
                ? "Verified intraday portfolio history is not available yet"
                : !enabled
                  ? `More ${option} history needed`
                  : `Show ${option} portfolio trend`
            }
            onClick={() => {
              if (!enabled || is1D) return;
              setPreferredPeriod(option);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full px-2.5 text-[13px] font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
              selected
                ? onLight
                  ? "bg-slate-950 text-white"
                  : "bg-white/90 text-slate-950"
                : enabled
                  ? onLight
                    ? "text-slate-800 hover:bg-sky-50 hover:text-slate-950"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                  : onLight
                    ? "cursor-not-allowed text-slate-400"
                    : "cursor-not-allowed text-white/30"
            }`}
            data-testid={`hero-trend-period-${option}`}
            data-available={enabled ? "true" : "false"}
          >
            {option}
          </button>
        );
      })}
    </div>
  );

  if (series.length < 2) {
    return (
      <div
        className={`min-w-0 overflow-hidden rounded-2xl border border-dashed px-3 py-2.5 ${
          onLight
            ? "border-sky-200 bg-white/70"
            : "border-white/15 bg-white/[0.03]"
        } ${className ?? ""}`}
        aria-label={`${label} unavailable`}
        data-testid="hero-performance-sparkline-empty"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p
            className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
              onLight ? "text-slate-700" : "text-white/70"
            }`}
          >
            Trend
          </p>
          {selector}
        </div>
        <div
          className={`flex w-full items-center justify-center text-[15px] font-medium ${
            onLight ? "text-slate-600" : "text-white/60"
          } ${emptyHeightClass}`}
        >
          Trend needs more history
        </div>
      </div>
    );
  }

  const width = 360;
  const height = 88;
  const padY = 8;
  const values = series.map((point) => point.portfolioValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = series.map((point, index) => {
    const x = (index / (series.length - 1)) * width;
    const y =
      height - padY - ((point.portfolioValue - min) / span) * (height - padY * 2);
    return { x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `0,${height} ${polyline} ${width},${height}`;

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const changePct = first !== 0 ? ((last - first) / first) * 100 : 0;
  const seriesTone =
    changePct > 0.05 ? "positive" : changePct < -0.05 ? "negative" : tone;

  const strokeClass =
    seriesTone === "positive"
      ? onLight
        ? "stroke-emerald-600"
        : "stroke-emerald-300"
      : seriesTone === "negative"
        ? onLight
          ? "stroke-red-600"
          : "stroke-red-300"
        : onLight
          ? "stroke-slate-600"
          : "stroke-white/70";
  const fillClass =
    seriesTone === "positive"
      ? onLight
        ? "fill-emerald-600/15"
        : "fill-emerald-300/15"
      : seriesTone === "negative"
        ? onLight
          ? "fill-red-600/10"
          : "fill-red-300/10"
        : onLight
          ? "fill-sky-500/10"
          : "fill-white/10";

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-2xl border px-3 py-2.5 ${
        onLight
          ? "border-sky-200/80 bg-white/80"
          : "border-white/10 bg-white/[0.04]"
      } ${className ?? ""}`}
      data-testid="hero-performance-sparkline"
      data-period={activePeriod}
    >
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
              onLight ? "text-slate-700" : "text-white/70"
            }`}
          >
            {periodLabel}
          </p>
          {changeLabel ? (
            <p
              className={`mt-0.5 truncate text-[15px] font-semibold tabular-nums ${
                onLight ? "text-slate-800" : "text-white/80"
              }`}
            >
              {changeLabel}
            </p>
          ) : null}
        </div>
        {selector}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${heightClass} w-full`}
        role="img"
        aria-label={`${label}. ${changeLabel ?? periodLabel}`}
        preserveAspectRatio="none"
      >
        <polygon points={area} className={fillClass} />
        <polyline
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClass}
          points={polyline}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
