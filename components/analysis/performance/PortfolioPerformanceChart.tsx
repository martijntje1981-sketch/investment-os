"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import {
  formatPerformanceAxisDate,
  formatPerformanceTooltipDate,
} from "@/lib/client/performance";
import type { PortfolioPerformancePoint } from "@/lib/client/performance";
import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING_COMPACT = { top: 16, right: 14, bottom: 28, left: 10 };
const PADDING_FULL = { top: 18, right: 18, bottom: 32, left: 50 };

/** Responsive plot shell heights (mobile / tablet / desktop). */
export const PERFORMANCE_CHART_SHELL_HEIGHT_CLASS =
  "h-[190px] sm:h-[210px] lg:h-[230px]";

export const PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE =
  "Your performance history will appear here once daily portfolio snapshots are available.";

type MappedPoint = PortfolioPerformancePoint & { x: number; y: number };

type ChartLayout = {
  points: MappedPoint[];
  minValue: number;
  maxValue: number;
  yTicks: number[];
  linePath: string;
  areaPath: string;
  padding: typeof PADDING_FULL;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useCompactChartLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(mobile.matches);
    update();
    mobile.addEventListener("change", update);
    return () => mobile.removeEventListener("change", update);
  }, []);

  return compact;
}

function buildSmoothLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  if (points.length === 2) {
    const [start, end] = points;
    const midX = (start.x + end.x) / 2;
    const deltaY = end.y - start.y;
    const controlY = midX === start.x ? start.y : start.y + deltaY * 0.22;
    return `M ${start.x} ${start.y} Q ${midX} ${controlY} ${end.x} ${end.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(index - 1, 0)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(index + 2, points.length - 1)];

    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (after.x - current.x) / 6;
    const cp2y = next.y - (after.y - current.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildChartLayout(
  points: PortfolioPerformancePoint[],
  compact: boolean,
): ChartLayout | null {
  if (points.length < 2) {
    return null;
  }

  const padding = compact ? PADDING_COMPACT : PADDING_FULL;
  const values = points.map((point) => point.portfolioValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = Math.max(maxValue - minValue, maxValue * 0.02, 1);
  const paddedMin = minValue - valueRange * 0.1;
  const paddedMax = maxValue + valueRange * 0.06;
  const innerWidth = CHART_WIDTH - padding.left - padding.right;
  const innerHeight = CHART_HEIGHT - padding.top - padding.bottom;

  const mapped = points.map((point, index) => {
    const x =
      padding.left +
      (index / Math.max(points.length - 1, 1)) * innerWidth;
    const y =
      padding.top +
      (1 - (point.portfolioValue - paddedMin) / (paddedMax - paddedMin)) *
        innerHeight;

    return { ...point, x, y };
  });

  const linePath = buildSmoothLinePath(mapped);
  const baselineY = padding.top + innerHeight;
  const lastPoint = mapped[mapped.length - 1];
  const firstPoint = mapped[0];
  const areaPath = `${linePath} L ${lastPoint?.x ?? padding.left} ${baselineY} L ${firstPoint?.x ?? padding.left} ${baselineY} Z`;

  const yTicks = compact
    ? [paddedMin, paddedMax]
    : [paddedMin, (paddedMin + paddedMax) / 2, paddedMax];

  return {
    points: mapped,
    minValue: paddedMin,
    maxValue: paddedMax,
    yTicks,
    linePath,
    areaPath,
    padding,
  };
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}m`;
  }

  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }

  return formatPortfolioCurrency(value);
}

function resolveTooltipStyle(
  point: MappedPoint,
  containerWidth: number,
): CSSProperties {
  const tooltipWidth = Math.min(176, Math.max(148, containerWidth - 16));
  const xRatio = point.x / CHART_WIDTH;
  const anchorX = xRatio * containerWidth;
  const maxLeft = Math.max(8, containerWidth - tooltipWidth - 8);
  const left = Math.min(Math.max(anchorX - tooltipWidth / 2, 8), maxLeft);

  return {
    left,
    top: 6,
    width: tooltipWidth,
  };
}

function ChartTooltip({
  point,
  style,
}: {
  point: MappedPoint;
  style: CSSProperties;
}) {
  const returnLabel =
    point.investmentReturn !== null
      ? formatSignedPortfolioCurrency(point.investmentReturn)
      : "Not available";

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[14px] border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.22)] backdrop-blur-sm"
      style={style}
      role="status"
      aria-live="polite"
    >
      <p className={appSectionLabelClass}>
        {formatPerformanceTooltipDate(point.date)}
      </p>
      <p className={`mt-1 ${appCardValueClass} text-slate-950`}>
        {formatPortfolioCurrency(point.portfolioValue)}
      </p>
      <p className={`mt-1.5 ${appSectionMetaClass} text-slate-600`}>
        Return {returnLabel}
      </p>
    </div>
  );
}

export function PortfolioPerformanceChart({
  points,
  hasSeries,
  emptyMessage = PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE,
}: {
  points: PortfolioPerformancePoint[];
  hasSeries: boolean;
  emptyMessage?: string;
}) {
  const compact = useCompactChartLayout();
  const prefersReducedMotion = usePrefersReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellWidth, setShellWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(
    points.length > 0 ? points.length - 1 : null,
  );

  const layout = useMemo(
    () => buildChartLayout(points, compact),
    [compact, points],
  );

  useEffect(() => {
    setActiveIndex(points.length > 0 ? points.length - 1 : null);
  }, [points]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setShellWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setShellWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [hasSeries, layout]);

  const activePoint =
    activeIndex !== null && layout ? layout.points[activeIndex] : null;
  const endPointIndex = layout ? layout.points.length - 1 : null;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!layout || layout.points.length === 0) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) =>
          Math.max((current ?? layout.points.length - 1) - 1, 0),
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) =>
          Math.min((current ?? 0) + 1, layout.points.length - 1),
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(layout.points.length - 1);
      }
    },
    [layout],
  );

  if (!hasSeries || !layout) {
    return (
      <div className="rounded-[16px] bg-gradient-to-b from-slate-50/90 to-white px-4 py-4 text-center ring-1 ring-slate-200/70 sm:py-5">
        <p className={appSectionLabelClass}>Portfolio value</p>
        <p
          className={`mx-auto mt-2 max-w-sm ${appSectionBodyClass} text-slate-600`}
        >
          {emptyMessage}
        </p>
      </div>
    );
  }

  const tooltipStyle =
    activePoint && shellWidth > 0
      ? resolveTooltipStyle(activePoint, shellWidth)
      : null;

  const xLabelIndices = compact
    ? [0, layout.points.length - 1]
    : layout.points.length <= 3
      ? layout.points.map((_, index) => index)
      : [0, layout.points.length - 1];

  return (
    <div className="min-w-0">
      <div
        ref={shellRef}
        tabIndex={0}
        role="group"
        aria-label="Portfolio value chart. Use arrow keys to inspect points."
        onKeyDown={handleKeyDown}
        className={`relative min-w-0 overflow-hidden rounded-[18px] bg-gradient-to-b from-slate-50/95 to-white px-1 py-1.5 ring-1 ring-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:px-2 sm:py-2 ${PERFORMANCE_CHART_SHELL_HEIGHT_CLASS}`}
      >
        {activePoint && tooltipStyle ? (
          <ChartTooltip point={activePoint} style={tooltipStyle} />
        ) : null}

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-full w-full max-w-full"
          role="img"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient
              id="performanceAreaFill"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <filter id="performancePointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {layout.yTicks.map((tick, index) => {
            const y =
              layout.padding.top +
              (1 -
                (tick - layout.minValue) /
                  (layout.maxValue - layout.minValue)) *
                (CHART_HEIGHT - layout.padding.top - layout.padding.bottom);

            return (
              <g key={`${tick}-${index}`}>
                <line
                  x1={layout.padding.left}
                  x2={CHART_WIDTH - layout.padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeOpacity={index === 1 && !compact ? 0.55 : 0.35}
                  strokeWidth="1"
                />
                {!compact ? (
                  <text
                    x={layout.padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] sm:text-[11px]"
                  >
                    {formatCompactCurrency(tick)}
                  </text>
                ) : null}
              </g>
            );
          })}

          <path d={layout.areaPath} fill="url(#performanceAreaFill)" />
          <path
            d={layout.linePath}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={prefersReducedMotion ? undefined : "transition-[d] duration-300 ease-out"}
          />

          {layout.points.map((point, index) => {
            const isActive = activeIndex === index;
            const isEndPoint = endPointIndex === index;
            const showMarker = isActive || isEndPoint;

            if (!showMarker) {
              return (
                <rect
                  key={`hit-${point.date}-${index}`}
                  x={point.x - 28}
                  y={layout.padding.top}
                  width={56}
                  height={
                    CHART_HEIGHT - layout.padding.top - layout.padding.bottom
                  }
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onTouchStart={() => setActiveIndex(index)}
                />
              );
            }

            return (
              <g key={`point-${point.date}-${index}`}>
                {isActive ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={10}
                    fill="#6366f1"
                    opacity={0.14}
                  />
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isEndPoint && !isActive ? 4.5 : 5}
                  fill="#4f46e5"
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter={isActive ? "url(#performancePointGlow)" : undefined}
                />
                <rect
                  x={point.x - 28}
                  y={layout.padding.top}
                  width={56}
                  height={
                    CHART_HEIGHT - layout.padding.top - layout.padding.bottom
                  }
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onTouchStart={() => setActiveIndex(index)}
                />
              </g>
            );
          })}

          {xLabelIndices.map((index) => {
            const point = layout.points[index];
            if (!point) return null;

            return (
              <text
                key={`label-${point.date}-${index}`}
                x={point.x}
                y={CHART_HEIGHT - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === layout.points.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-slate-400 text-[10px] sm:text-[11px]"
              >
                {formatPerformanceAxisDate(point.date)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
