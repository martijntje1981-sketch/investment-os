/**
 * Holding price history for Position Summary charts.
 * Uses the same EODHD providerSymbol identity as live quotes.
 */

import {
  fetchEodhdEodHistory,
  periodStartDate,
} from "@/lib/services/marketPulse/eodHistory";
import type { MarketPulsePoint } from "@/lib/services/marketPulse/types";

export const HOLDING_HISTORY_MIN_POINTS = 2;

export type HoldingHistoryWindow = "1M" | "3M" | "1Y";

export type HoldingPriceHistoryResult = {
  available: boolean;
  providerSymbol: string | null;
  points: MarketPulsePoint[];
  window: HoldingHistoryWindow | null;
  sourceLabel: string | null;
  updatedAt: string | null;
  unavailableReason: string | null;
};

const WINDOW_ORDER: HoldingHistoryWindow[] = ["1M", "3M", "1Y"];

export function selectSufficientHistory(
  candidates: Array<{
    window: HoldingHistoryWindow;
    points: MarketPulsePoint[];
  }>,
  minPoints = HOLDING_HISTORY_MIN_POINTS,
): { window: HoldingHistoryWindow; points: MarketPulsePoint[] } | null {
  for (const candidate of candidates) {
    if (candidate.points.length >= minPoints) {
      return candidate;
    }
  }
  return null;
}

export async function fetchHoldingPriceHistory(input: {
  providerSymbol?: string | null;
  assetType?: string | null;
  now?: Date;
  fetchHistory?: (
    providerSymbol: string,
    fromIsoDate: string,
    toIsoDate: string,
  ) => Promise<MarketPulsePoint[]>;
}): Promise<HoldingPriceHistoryResult> {
  const providerSymbol = input.providerSymbol?.trim() || null;
  const now = input.now ?? new Date();
  const toIsoDate = now.toISOString().slice(0, 10);
  const fetchHistory = input.fetchHistory ?? fetchEodhdEodHistory;

  if (!providerSymbol) {
    return {
      available: false,
      providerSymbol: null,
      points: [],
      window: null,
      sourceLabel: null,
      updatedAt: null,
      unavailableReason:
        "Price history appears when a verified market listing is available.",
    };
  }

  if (input.assetType === "cash") {
    return {
      available: false,
      providerSymbol,
      points: [],
      window: null,
      sourceLabel: null,
      updatedAt: null,
      unavailableReason: "Cash holdings do not have market price history.",
    };
  }

  const candidates: Array<{
    window: HoldingHistoryWindow;
    points: MarketPulsePoint[];
  }> = [];

  for (const window of WINDOW_ORDER) {
    try {
      const fromIsoDate = periodStartDate(window, now);
      const points = await fetchHistory(providerSymbol, fromIsoDate, toIsoDate);
      candidates.push({ window, points });
      if (points.length >= HOLDING_HISTORY_MIN_POINTS) {
        break;
      }
    } catch {
      candidates.push({ window, points: [] });
    }
  }

  const selected = selectSufficientHistory(candidates);
  if (!selected) {
    return {
      available: false,
      providerSymbol,
      points: [],
      window: null,
      sourceLabel: null,
      updatedAt: null,
      unavailableReason:
        "Price history appears when sufficient market data is available.",
    };
  }

  const lastPoint = selected.points[selected.points.length - 1];
  const isCrypto = providerSymbol.toUpperCase().endsWith(".CC");

  return {
    available: true,
    providerSymbol,
    points: selected.points,
    window: selected.window,
    sourceLabel: isCrypto
      ? `EODHD crypto · ${providerSymbol}`
      : `EODHD · ${providerSymbol}`,
    updatedAt: lastPoint?.date
      ? `${lastPoint.date}T00:00:00.000Z`
      : now.toISOString(),
    unavailableReason: null,
  };
}
