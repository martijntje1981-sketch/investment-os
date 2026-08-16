"use client";

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

/**
 * Real portfolio value sparkline for the black hero.
 * Uses existing performance history chart points — no invented series.
 */
export function HeroPerformanceSparkline({
  points,
  tone = "neutral",
  label = "Portfolio trend",
  className,
  compactOnMobile = false,
}: {
  points: PortfolioPerformancePoint[] | null | undefined;
  tone?: "positive" | "negative" | "neutral";
  label?: string;
  className?: string;
  /** Slightly shorter chart on narrow viewports. */
  compactOnMobile?: boolean;
}) {
  const series = (points ?? []).filter(
    (point) => Number.isFinite(point.portfolioValue),
  );

  const heightClass = compactOnMobile
    ? "h-[56px] sm:h-[72px] lg:h-[84px]"
    : "h-[72px] sm:h-[84px]";
  const emptyHeightClass = compactOnMobile
    ? "h-[56px] sm:h-[72px]"
    : "h-[72px]";

  if (series.length < 2) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-3 text-[12px] font-medium text-white/40 ${emptyHeightClass} ${className ?? ""}`}
        aria-label={`${label} unavailable`}
        data-testid="hero-performance-sparkline-empty"
      >
        Trend needs more history
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

  const strokeClass =
    tone === "positive"
      ? "stroke-emerald-300"
      : tone === "negative"
        ? "stroke-red-300"
        : "stroke-white/70";
  const fillClass =
    tone === "positive"
      ? "fill-emerald-300/15"
      : tone === "negative"
        ? "fill-red-300/10"
        : "fill-white/10";

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const changePct = first !== 0 ? ((last - first) / first) * 100 : 0;
  const changeLabel = `${changePct >= 0 ? "+" : "−"}${Math.abs(changePct).toFixed(1)}% over period`;

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 ${className ?? ""}`}
      data-testid="hero-performance-sparkline"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
          1M trend
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-white/55">
          {changeLabel}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${heightClass} w-full`}
        role="img"
        aria-label={`${label}. ${changeLabel}`}
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
