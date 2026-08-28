"use client";

import { useId, useMemo, useState } from "react";

import {
  HERO_TREND_DEFAULT_PERIOD,
  HERO_TREND_PERIOD_ORDER,
  type HeroTrendPeriodId,
} from "@/components/dashboard/heroTrendPeriods";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type { HeroTrendPeriodId };

function usablePoints(
  points: PortfolioPerformancePoint[] | null | undefined,
): PortfolioPerformancePoint[] {
  return (points ?? []).filter((point) => Number.isFinite(point.portfolioValue));
}

function formatPeriodChange(
  points: PortfolioPerformancePoint[],
  period: HeroTrendPeriodId,
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
 * 1M default. 1W only when genuine history exists. No fabricated series.
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
  appearance = "onDark",
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
  const gradientId = useId();
  const onLight = appearance === "onLight";
  const weekSeries = useMemo(() => usablePoints(weekPoints), [weekPoints]);
  const monthSeries = useMemo(
    () => usablePoints(monthPoints ?? points),
    [monthPoints, points],
  );

  const weekAvailable = weekSeries.length >= 2;
  const monthAvailable = monthSeries.length >= 2;

  const [preferredPeriod, setPreferredPeriod] = useState<HeroTrendPeriodId>(
    HERO_TREND_DEFAULT_PERIOD,
  );

  const activePeriod: HeroTrendPeriodId =
    preferredPeriod === "1M" && monthAvailable
      ? "1M"
      : preferredPeriod === "1W" && weekAvailable
        ? "1W"
        : monthAvailable
          ? "1M"
          : "1W";

  const series = activePeriod === "1W" ? weekSeries : monthSeries;

  const heightClass = compactOnMobile
    ? "h-[92px] sm:h-[118px] lg:h-[136px]"
    : "h-[104px] sm:h-[124px]";
  const emptyHeightClass = compactOnMobile
    ? "h-[92px] sm:h-[118px]"
    : "h-[104px]";

  const periodLabel = activePeriod === "1W" ? "1W trend" : "1M trend";
  const changeLabel =
    series.length >= 2 ? formatPeriodChange(series, activePeriod) : null;

  const selector = (
    <div
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full p-0.5 ${
        onLight ? "bg-white/80" : "bg-white/8"
      }`}
      role="tablist"
      aria-label="Portfolio trend period"
      data-testid="hero-trend-period-selector"
    >
      {HERO_TREND_PERIOD_ORDER.map((option) => {
        const enabled = option === "1W" ? weekAvailable : monthAvailable;
        const selected = enabled && activePeriod === option;

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!enabled}
            title={
              !enabled ? `More ${option} history needed` : `Show ${option} portfolio trend`
            }
            onClick={() => {
              if (!enabled) return;
              setPreferredPeriod(option);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full px-2.5 text-[12px] font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
              selected
                ? onLight
                  ? "bg-navy-hero text-white"
                  : "bg-white/15 text-white"
                : enabled
                  ? onLight
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
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
        className={`min-w-0 overflow-hidden ${className ?? ""}`}
        aria-label={`${label} unavailable`}
        data-testid="hero-performance-sparkline-empty"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p
            className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${
              onLight ? "text-slate-600" : "text-white/55"
            }`}
          >
            Trend
          </p>
          {selector}
        </div>
        <div
          className={`flex w-full items-center justify-center rounded-2xl border border-dashed text-[15px] font-medium ${
            onLight
              ? "border-brand/25 bg-white/70 text-slate-600"
              : "border-white/15 bg-white/[0.04] text-white/65"
          } ${emptyHeightClass}`}
        >
          Trend needs more history
        </div>
      </div>
    );
  }

  const width = 360;
  const height = 88;
  const padY = 10;
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
  const lastCoord = coords[coords.length - 1]!;
  const area = `0,${height} ${polyline} ${width},${height}`;

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const changePct = first !== 0 ? ((last - first) / first) * 100 : 0;
  const seriesTone =
    changePct > 0.05 ? "positive" : changePct < -0.05 ? "negative" : tone;

  const stroke =
    seriesTone === "positive"
      ? onLight
        ? "#059669"
        : "#34d399"
      : seriesTone === "negative"
        ? onLight
          ? "#e11d48"
          : "#fb7185"
        : onLight
          ? "#64748b"
          : "#7dd3fc";
  const fillStart =
    seriesTone === "positive"
      ? onLight
        ? "rgba(5,150,105,0.22)"
        : "rgba(52,211,153,0.28)"
      : seriesTone === "negative"
        ? onLight
          ? "rgba(225,29,72,0.16)"
          : "rgba(251,113,133,0.22)"
        : onLight
          ? "rgba(14,165,233,0.16)"
          : "rgba(125,211,252,0.22)";

  return (
    <div
      className={`min-w-0 overflow-hidden ${className ?? ""}`}
      data-testid="hero-performance-sparkline"
      data-period={activePeriod}
    >
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${
              onLight ? "text-slate-600" : "text-white/55"
            }`}
          >
            {periodLabel}
          </p>
          {changeLabel ? (
            <p
              className={`mt-0.5 truncate text-[13px] font-semibold tabular-nums ${
                onLight ? "text-slate-800" : "text-white/85"
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
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStart} />
            <stop offset="100%" stopColor="rgba(7,21,37,0)" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r="3.2"
          fill={stroke}
          stroke={onLight ? "#ffffff" : "#0b1f3a"}
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}
