"use client";

import type { MarketPulsePoint } from "@/lib/services/marketPulse/types";

export function MarketPulseSparkline({
  points,
  accentClassName = "stroke-sky-400",
  label,
}: {
  points: MarketPulsePoint[];
  accentClassName?: string;
  label: string;
}) {
  if (points.length < 2) {
    return (
      <div
        className="flex h-10 items-center text-[12px] font-medium text-slate-500"
        aria-label={`${label} history unavailable`}
      >
        —
      </div>
    );
  }

  const width = 120;
  const height = 36;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-[120px]"
      role="img"
      aria-label={`${label} sparkline`}
    >
      <polyline
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={accentClassName}
        points={coords.join(" ")}
      />
    </svg>
  );
}
