/**
 * Cached EODHD end-of-day history for Market Pulse charts.
 */

import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";
import { executeEodhdApiCall } from "@/lib/services/marketData/eodhdApiCall";
import type { MarketPulsePoint } from "@/lib/services/marketPulse/types";

type CacheEntry = {
  expiresAt: number;
  points: MarketPulsePoint[];
};

const historyCache = new Map<string, CacheEntry>();
const HISTORY_TTL_MS = 60 * 60 * 1000;

type EodRow = {
  date?: string;
  close?: number;
  adjusted_close?: number;
};

function cacheKey(providerSymbol: string, from: string, to: string): string {
  return `${providerSymbol}|${from}|${to}`;
}

export function resetMarketPulseHistoryCacheForTests() {
  historyCache.clear();
}

export async function fetchEodhdEodHistory(
  providerSymbol: string,
  fromIsoDate: string,
  toIsoDate: string,
): Promise<MarketPulsePoint[]> {
  const key = cacheKey(providerSymbol, fromIsoDate, toIsoDate);
  const cached = historyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.points;
  }

  const apiKey = getEodhdApiKey();
  const points = await executeEodhdApiCall(async () => {
    const url =
      `https://eodhd.com/api/eod/${encodeURIComponent(providerSymbol)}` +
      `?api_token=${encodeURIComponent(apiKey)}&fmt=json` +
      `&from=${encodeURIComponent(fromIsoDate)}&to=${encodeURIComponent(toIsoDate)}&period=d`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `EODHD EOD ${providerSymbol} returned ${response.status}`,
      );
    }

    const raw = (await response.json()) as EodRow[] | { error?: string };
    if (!Array.isArray(raw)) {
      throw new Error(
        `EODHD EOD ${providerSymbol} returned unexpected payload`,
      );
    }

    return raw
      .map((row) => {
        const value = row.adjusted_close ?? row.close;
        if (!row.date || typeof value !== "number" || !Number.isFinite(value)) {
          return null;
        }
        return { date: row.date, value };
      })
      .filter((point): point is MarketPulsePoint => point !== null);
  });

  historyCache.set(key, { points, expiresAt: Date.now() + HISTORY_TTL_MS });
  return points;
}

export function periodStartDate(
  period: "1W" | "1M" | "3M" | "1Y",
  now = new Date(),
): string {
  const date = new Date(now);
  if (period === "1W") date.setUTCDate(date.getUTCDate() - 8);
  else if (period === "1M") date.setUTCDate(date.getUTCDate() - 32);
  else if (period === "3M") date.setUTCDate(date.getUTCDate() - 95);
  else date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export function changePercentFromHistory(
  history: MarketPulsePoint[],
): number | null {
  if (history.length < 2) return null;
  const first = history[0]?.value;
  const last = history[history.length - 1]?.value;
  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === 0
  ) {
    return null;
  }
  return ((last - first) / first) * 100;
}
