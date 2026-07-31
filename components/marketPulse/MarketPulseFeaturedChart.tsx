"use client";

import { useMemo, useState } from "react";

import type {
  MarketPulseAsset,
  MarketPulsePeriod,
} from "@/lib/services/marketPulse/types";

const PERIODS: MarketPulsePeriod[] = ["1W", "1M", "3M", "1Y"];

function accentStroke(accent: string): string {
  if (accent === "gold") return "#D4A017";
  if (accent === "silver") return "#94A3B8";
  if (accent === "copper") return "#B87333";
  if (accent === "uranium") return "#34D399";
  if (accent === "bitcoin") return "#F59E0B";
  return "#818CF8";
}

export function MarketPulseFeaturedChart({
  asset,
  period,
  onPeriodChange,
  selectableIds,
  onSelectAsset,
  assetsById,
}: {
  asset: MarketPulseAsset | null;
  period: MarketPulsePeriod;
  onPeriodChange: (period: MarketPulsePeriod) => void;
  selectableIds: string[];
  onSelectAsset: (id: string) => void;
  assetsById: Map<string, MarketPulseAsset>;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (!asset || asset.history.length < 2) return null;
    const width = 720;
    const height = 280;
    const pad = { top: 20, right: 16, bottom: 28, left: 12 };
    const values = asset.history.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = asset.history.map((point, index) => {
      const x =
        pad.left +
        (index / (asset.history.length - 1)) * (width - pad.left - pad.right);
      const y =
        pad.top +
        (1 - (point.value - min) / span) * (height - pad.top - pad.bottom);
      return { ...point, x, y };
    });
    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
    const area = `${line} L${points[points.length - 1].x},${height - pad.bottom} L${points[0].x},${height - pad.bottom} Z`;
    return { width, height, points, line, area, min, max };
  }, [asset]);

  if (!asset) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-[15px] text-slate-600">
        Featured market data is unavailable right now.
      </div>
    );
  }

  const focusPoint =
    focusIndex !== null && layout ? layout.points[focusIndex] : null;
  const stroke = accentStroke(asset.accent);

  return (
    <section
      className="overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-950 p-5 text-white shadow-sm sm:p-8"
      aria-labelledby="featured-market-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            Featured chart
          </p>
          <h2
            id="featured-market-heading"
            className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl"
          >
            {asset.name}
          </h2>
          <p className="mt-1.5 text-[13px] font-medium text-white/65">
            {asset.sourceType}
            {asset.isProxy ? " · ETF Proxy (not spot)" : ""}
            {" · "}
            {asset.providerSymbol}
            {asset.tradingPair ? ` · ${asset.tradingPair}` : ""}
          </p>
          <p className="mt-1 text-[12px] font-medium text-white/50">
            {asset.marketStatus ?? "Status unknown"}
            {" · Provider data "}
            {asset.quoteUpdatedAt || asset.updatedAt
              ? new Date(
                  asset.quoteUpdatedAt ?? asset.updatedAt!,
                ).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Current value
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-[-0.03em] sm:text-5xl">
            {asset.displayPrice !== null
              ? asset.displayPrice.toLocaleString("en-GB", {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </p>
          <p className="mt-1 text-[13px] font-medium text-white/65">
            {[asset.unit, asset.displayCurrency].filter(Boolean).join(" · ") ||
              "Value unavailable"}
          </p>
          <p className="mt-2 text-[15px] font-semibold tabular-nums">
            {asset.chartPeriodChangePercent !== null
              ? `${asset.chartPeriodChangePercent >= 0 ? "+" : ""}${asset.chartPeriodChangePercent.toFixed(1)}% · ${asset.chartPeriod ?? period}`
              : `Period performance unavailable · ${period}`}
          </p>
        </div>
      </div>

      {selectableIds.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {selectableIds.map((id) => {
            const option = assetsById.get(id);
            if (!option) return null;
            const selected = option.id === asset.id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectAsset(id)}
                className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-semibold ${
                  selected
                    ? "bg-white text-slate-950"
                    : "border border-white/20 bg-white/5 text-white"
                }`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPeriodChange(item)}
            className={`min-h-[40px] min-w-[44px] rounded-full px-3 text-[13px] font-semibold ${
              period === item
                ? "bg-sky-400 text-slate-950"
                : "border border-white/15 text-white/80"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 h-[240px] sm:h-[300px]">
        {layout ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="h-full w-full"
            role="img"
            aria-label={`${asset.name} ${period} chart`}
          >
            <path d={layout.area} fill={stroke} opacity="0.15" />
            <path
              d={layout.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2.75"
              strokeLinecap="round"
            />
            {layout.points.map((point, index) => (
              <circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                r={focusIndex === index ? 5 : 0}
                fill="#fff"
                className="cursor-pointer"
                onClick={() => setFocusIndex(index)}
                onFocus={() => setFocusIndex(index)}
                tabIndex={0}
                role="button"
                aria-label={`${point.date}: ${point.value}`}
              />
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-[15px] text-white/60">
            Historical series unavailable for this period.
          </div>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-[12px] font-medium text-white/70 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-white/45">Period</dt>
          <dd className="mt-0.5 text-white">{period}</dd>
        </div>
        <div>
          <dt className="text-white/45">High</dt>
          <dd className="mt-0.5 tabular-nums text-white">
            {asset.periodHigh !== null ? asset.periodHigh.toFixed(2) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Low</dt>
          <dd className="mt-0.5 tabular-nums text-white">
            {asset.periodLow !== null ? asset.periodLow.toFixed(2) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Last update</dt>
          <dd className="mt-0.5 text-white">
            {asset.updatedAt
              ? new Date(asset.updatedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Data source</dt>
          <dd className="mt-0.5 text-white">
            {asset.provider}
            {asset.delayed ? " · Delayed / EOD" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Frequency</dt>
          <dd className="mt-0.5 text-white">{asset.dataFrequency ?? "—"}</dd>
        </div>
      </dl>
      {asset.relevanceWhy ? (
        <p className="mt-4 max-w-2xl text-[13px] font-medium leading-snug text-sky-200/90">
          {asset.relevanceWhy.split("\n")[0]}
        </p>
      ) : null}
      {focusPoint ? (
        <p className="mt-2 text-[12px] font-medium text-white">
          Focus {focusPoint.date}: {focusPoint.value.toFixed(2)}
        </p>
      ) : null}
    </section>
  );
}
