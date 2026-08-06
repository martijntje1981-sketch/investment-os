"use client";

import { useEffect, useMemo, useState } from "react";

import type { HoldingPriceHistoryResult } from "@/lib/services/holdings/fetchHoldingPriceHistory";
import type { MarketPulsePoint } from "@/lib/services/marketPulse/types";

function HoldingHistoryChart({ points }: { points: MarketPulsePoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 12;

  const { path, area, first, last, changePercent } = useMemo(() => {
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const coords = points.map((point, index) => {
      const x =
        padding +
        (index / Math.max(1, points.length - 1)) * (width - padding * 2);
      const y =
        padding + (1 - (point.value - min) / span) * (height - padding * 2);
      return { x, y };
    });
    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`)
      .join(" ");
    const areaPath = `${line} L${coords[coords.length - 1]!.x},${height - padding} L${coords[0]!.x},${height - padding} Z`;
    const start = points[0]!.value;
    const end = points[points.length - 1]!.value;
    const pct = start === 0 ? null : ((end - start) / start) * 100;
    return {
      path: line,
      area: areaPath,
      first: start,
      last: end,
      changePercent: pct,
    };
  }, [points]);

  const tone =
    changePercent == null
      ? "text-slate-600"
      : changePercent >= 0
        ? "text-emerald-600"
        : "text-red-600";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Latest close</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">
            {last.toLocaleString("en-GB", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        {changePercent != null ? (
          <p className={`text-sm font-bold tabular-nums ${tone}`}>
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}% vs start of window
          </p>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-52 w-full"
        role="img"
        aria-label="Holding price history chart"
      >
        <path d={area} className="fill-blue-100/70" />
        <path
          d={path}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-blue-600"
        />
      </svg>
      <p className="mt-1 text-[11px] font-medium text-slate-400">
        First {first.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ·{" "}
        {points.length} sessions
      </p>
    </div>
  );
}

export function HoldingPositionHistory({
  symbol,
  providerSymbol,
}: {
  symbol: string;
  providerSymbol?: string | null;
}) {
  const [history, setHistory] = useState<HoldingPriceHistoryResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/holdings/history?symbol=${encodeURIComponent(symbol)}`,
          { method: "GET", credentials: "same-origin", cache: "no-store" },
        );
        if (!response.ok) {
          if (!cancelled) {
            setHistory({
              available: false,
              providerSymbol: providerSymbol ?? null,
              points: [],
              window: null,
              sourceLabel: null,
              updatedAt: null,
              unavailableReason:
                "Price history appears when sufficient market data is available.",
            });
          }
          return;
        }
        const payload = (await response.json()) as {
          success?: boolean;
          history?: HoldingPriceHistoryResult;
        };
        if (!cancelled) {
          setHistory(
            payload.history ?? {
              available: false,
              providerSymbol: providerSymbol ?? null,
              points: [],
              window: null,
              sourceLabel: null,
              updatedAt: null,
              unavailableReason:
                "Price history appears when sufficient market data is available.",
            },
          );
        }
      } catch {
        if (!cancelled) {
          setHistory({
            available: false,
            providerSymbol: providerSymbol ?? null,
            points: [],
            window: null,
            sourceLabel: null,
            updatedAt: null,
            unavailableReason:
              "Price history appears when sufficient market data is available.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [symbol, providerSymbol]);

  if (loading) {
    return (
      <div className="mt-8 flex h-52 items-center justify-center rounded-2xl bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading price history…
        </p>
      </div>
    );
  }

  if (!history?.available || history.points.length < 2) {
    return (
      <div className="mt-8 rounded-2xl bg-slate-50 px-5 py-8">
        <p className="text-sm font-medium text-slate-600">
          {history?.unavailableReason ??
            "Price history appears when sufficient market data is available."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-100 bg-gradient-to-b from-blue-50/80 to-white p-4 sm:p-5">
      <HoldingHistoryChart points={history.points} />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
        {history.window ? <span>Window: {history.window}</span> : null}
        {history.sourceLabel ? <span>{history.sourceLabel}</span> : null}
        {history.updatedAt ? (
          <span>
            Updated{" "}
            {new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(history.updatedAt))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
