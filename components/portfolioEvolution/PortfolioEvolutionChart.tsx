"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  formatPerformanceAxisDate,
  formatPerformanceTooltipDate,
} from "@/lib/client/performance";
import type { PortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution";

const WIDTH = 640;
const HEIGHT = 228;
const PAD = { top: 18, right: 18, bottom: 16, left: 12 };

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function yAtX(
  mapped: Array<{ x: number; y: number }>,
  x: number,
): number {
  if (mapped.length === 0) return PAD.top;
  if (x <= mapped[0]!.x) return mapped[0]!.y;
  const last = mapped[mapped.length - 1]!;
  if (x >= last.x) return last.y;
  for (let index = 0; index < mapped.length - 1; index += 1) {
    const left = mapped[index]!;
    const right = mapped[index + 1]!;
    if (x <= right.x) {
      const span = Math.max(right.x - left.x, 1);
      const t = (x - left.x) / span;
      return left.y + t * (right.y - left.y);
    }
  }
  return last.y;
}

function compactAmount(value: number, formatEur: (value: number) => string): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${value >= 0 ? "+" : "−"}€${Math.round(abs / 100) / 10}k`;
  }
  return `${value >= 0 ? "+" : "−"}${formatEur(abs)}`;
}

export function PortfolioEvolutionChart({
  timeline,
  selectedEventId,
  onSelectEvent,
  compact = false,
  showFunding = true,
}: {
  timeline: PortfolioEvolutionTimeline;
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  compact?: boolean;
  showFunding?: boolean;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const reactId = useId();
  const fillId = `evolution-area-${reactId.replace(/:/g, "")}`;
  const shellRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const fundingEvents = useMemo(
    () => (showFunding ? timeline.fundingEvents : []),
    [showFunding, timeline.fundingEvents],
  );
  const structural = useMemo(
    () =>
      showFunding
        ? timeline.structuralMarkers.filter(
            (row) => row.kind !== "contribution" && row.kind !== "withdrawal",
          )
        : [],
    [showFunding, timeline.structuralMarkers],
  );
  const dashboardStructural = compact
    ? structural.slice(0, Math.max(0, 4 - fundingEvents.length))
    : structural;

  const layout = useMemo(() => {
    const points = timeline.valueSeries;
    if (points.length < 2) return null;
    const values = points.map((point) => point.portfolioValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, max * 0.02, 1);
    const paddedMin = min - range * 0.16;
    const paddedMax = max + range * 0.18;
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const mapped = points.map((point, index) => {
      const x = PAD.left + (index / Math.max(points.length - 1, 1)) * innerW;
      const y =
        PAD.top +
        (1 - (point.portfolioValue - paddedMin) / (paddedMax - paddedMin)) * innerH;
      return { ...point, x, y };
    });
    const start = mapped[0]!;
    const end = mapped[mapped.length - 1]!;
    const line = linePath(mapped);
    const area = `${line} L ${end.x} ${PAD.top + innerH} L ${start.x} ${PAD.top + innerH} Z`;
    const xAtDate = (date: string) => {
      const first = mapped[0]!.date;
      const last = mapped[mapped.length - 1]!.date;
      const span = Math.max(
        Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`),
        1,
      );
      const at = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`);
      const clamped = Math.min(Math.max(at / span, 0), 1);
      return PAD.left + clamped * innerW;
    };
    return { mapped, start, end, line, area, xAtDate, innerH };
  }, [timeline.valueSeries]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [layout]);

  const selected = fundingEvents.find((event) => event.id === selectedEventId) ?? null;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (fundingEvents.length === 0) return;
      const ids = fundingEvents.map((row) => row.id);
      const current = selectedEventId ? ids.indexOf(selectedEventId) : -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onSelectEvent(ids[Math.min(current + 1, ids.length - 1)] ?? null);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onSelectEvent(ids[Math.max(current - 1, 0)] ?? null);
      } else if (event.key === "Escape") {
        onSelectEvent(null);
      }
    },
    [fundingEvents, onSelectEvent, selectedEventId],
  );

  if (!layout) return null;

  const popoverLeft = selected
    ? Math.min(
        Math.max(layout.xAtDate(selected.date) * (width / WIDTH) - 90, 8),
        Math.max(width - 188, 8),
      )
    : 8;

  return (
    <div className="min-w-0 overflow-x-clip">
      <div
        ref={shellRef}
        tabIndex={0}
        role="group"
        aria-label="Portfolio evolution chart. Arrow keys move between recorded funding events."
        onKeyDown={handleKeyDown}
        className="relative min-w-0 overflow-x-clip rounded-[20px] bg-gradient-to-b from-cyan-50/90 to-white"
      >
        {selected ? (
          <div
            className="absolute z-20 w-[180px] rounded-[14px] border border-slate-200/90 bg-white/96 px-3 py-2.5 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.22)]"
            style={{ left: popoverLeft, top: 8 }}
            role="status"
          >
            <p className={appSectionLabelClass}>
              {formatPerformanceTooltipDate(selected.date)}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-slate-950">
              {selected.title} {compactAmount(selected.amount, formatEur)}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              Immediate recorded effect: portfolio funding{" "}
              {compactAmount(selected.amount, formatEur)}
            </p>
            {selected.allocationCoincidence ? (
              <p className={`mt-1 ${appSectionMetaClass}`}>
                Coincided with {selected.allocationCoincidence.groupLabel}{" "}
                {selected.allocationCoincidence.fromPercent}% →{" "}
                {selected.allocationCoincidence.toPercent}%
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3 px-3 pt-3">
          <p className="min-w-0 text-[13px] font-semibold tabular-nums text-slate-700 sm:text-[15px]">
            {formatEur(layout.start.portfolioValue)}
          </p>
          <p className="min-w-0 text-right text-[13px] font-semibold tabular-nums text-slate-950 sm:text-[15px]">
            {formatEur(layout.end.portfolioValue)}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[168px] w-full max-w-full sm:h-[196px] lg:h-[214px]"
          role="img"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </linearGradient>
          </defs>
          {(timeline.mixCheckpoints ?? []).map((checkpoint) => {
            const x = layout.xAtDate(checkpoint.date);
            return (
              <line
                key={`mix-${checkpoint.date}`}
                x1={x}
                x2={x}
                y1={PAD.top}
                y2={PAD.top + layout.innerH}
                stroke="#a5f3fc"
                strokeWidth="1.5"
                strokeDasharray="2 6"
              />
            );
          })}
          <path d={layout.area} fill={`url(#${fillId})`} />
          <path
            d={layout.line}
            fill="none"
            stroke="#0e7490"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {dashboardStructural.map((marker) => {
            const x = layout.xAtDate(marker.date);
            const y = yAtX(layout.mapped, x);
            return (
              <polygon
                key={marker.id}
                points={`${x},${y - 6} ${x + 5},${y} ${x},${y + 6} ${x - 5},${y}`}
                fill="#155e75"
              />
            );
          })}
          {fundingEvents.map((event) => {
            const x = layout.xAtDate(event.date);
            const y = yAtX(layout.mapped, x);
            const isSelected = event.id === selectedEventId;
            const fill = event.kind === "withdrawal" ? "#e11d48" : "#059669";
            return (
              <g key={event.id}>
                <circle cx={x} cy={y} r={isSelected ? 7 : 5.5} fill={fill} stroke="#ffffff" strokeWidth="2" />
                {!compact ? (
                  <text
                    x={x}
                    y={y - 14}
                    textAnchor="middle"
                    className="fill-slate-800 text-[11px] font-semibold"
                  >
                    {compactAmount(event.amount, formatEur)}
                  </text>
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="transparent"
                  onClick={() =>
                    onSelectEvent(event.id === selectedEventId ? null : event.id)
                  }
                />
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between gap-3 px-3 pb-2">
          <p className="text-[13px] text-slate-500">
            {formatPerformanceAxisDate(layout.start.date)}
          </p>
          <p className="text-right text-[13px] text-slate-500">
            {formatPerformanceAxisDate(layout.end.date)}
          </p>
        </div>

        {fundingEvents.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-2 pb-2">
            {fundingEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() =>
                  onSelectEvent(event.id === selectedEventId ? null : event.id)
                }
                className={`inline-flex min-h-11 min-w-11 items-center rounded-full px-3 text-[13px] font-semibold ${
                  event.kind === "withdrawal"
                    ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                    : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                }`}
                aria-pressed={event.id === selectedEventId}
              >
                {event.kind === "withdrawal" ? "Withdrawal" : "Contribution"}{" "}
                {compactAmount(event.amount, formatEur)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {!compact && selected ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          A recorded {selected.kind} is funding, not investment return.
        </p>
      ) : null}
    </div>
  );
}
